import { z } from 'zod';
import type { YiyuTongSameTabExecutionPlan, YiyuTongSameTabGraphStep } from './yiyuTongApi';
import { proxyYiyuTongPageAgent } from './yiyuTongApi';

export type YiyuTongTaskPhase =
  | 'understanding'
  | 'planning'
  | 'locating'
  | 'acting'
  | 'done'
  | 'error';

export interface ExecuteYiyuTongSiteTaskOptions {
  plan: YiyuTongSameTabExecutionPlan;
  ignoredElements?: Array<Element | null | (() => Element | null)>;
  onPhaseChange?: (phase: YiyuTongTaskPhase, detail?: string) => void;
  onProgressChange?: (entries: YiyuTongProgressEntry[]) => void;
}

type LocalFormFields = {
  name?: string;
  organization?: string;
  phone?: string;
  email?: string;
  note?: string;
};

export type YiyuTongProgressEntry = {
  id: string;
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'done' | 'error';
};

const EXECUTION_MAX_STEPS = 120;
const EXECUTION_HEARTBEAT_GRACE_MS = 30_000;
const EXECUTION_PROGRESS_GRACE_MS = 60_000;
const EXECUTION_GLOBAL_FUSE_MS = 1_800_000;
const EXECUTION_WATCHDOG_INTERVAL_MS = 600;
const EXECUTION_LOOP_REPEAT_LIMIT = 5;
const TOUR_IDLE_NUDGE_MS = 6_000;
const PAGE_AGENT_HIDE_STYLE_ID = 'yiyu-page-agent-hide-style';
const COMMENT_VERIFICATION_LOOKBACK_MS = 5 * 60 * 1000;

let latestVerifiedCommentSubmission:
  | {
      contentId: string;
      contentType: 'insight' | 'report' | 'book' | 'methodology';
      text: string;
      verifiedAt: number;
    }
  | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readSavedAuthToken() {
  return localStorage.getItem('yiyu_auth_token') ?? sessionStorage.getItem('yiyu_auth_token') ?? '';
}

function inferCommentTargetFromUrl():
  | { contentId: string; contentType: 'insight' | 'report' | 'book' | 'methodology' }
  | null {
  const params = new URLSearchParams(window.location.search);
  const contentId = params.get('id') || '';
  const page = params.get('page') || '';
  if (!contentId || !page) return null;
  const typeMap: Record<string, 'insight' | 'report' | 'book' | 'methodology'> = {
    article: 'insight',
    report: 'report',
    'book-reader': 'book',
    methodology: 'methodology',
  };
  const contentType = typeMap[page];
  if (!contentType) return null;
  return { contentId, contentType };
}

async function verifyPendingComment({
  contentId,
  contentType,
  expectedText,
}: {
  contentId: string;
  contentType: 'insight' | 'report' | 'book' | 'methodology';
  expectedText: string;
}) {
  const token = readSavedAuthToken();
  if (!token || !contentId || !contentType || !expectedText.trim()) return false;
  const params = new URLSearchParams({
    contentId,
    contentType,
    scope: 'admin',
  });
  try {
    const response = await fetch(`/api/auth/comments?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false || !Array.isArray(json?.data)) return false;
    const expected = expectedText.trim();
    const now = Date.now();
    return json.data.some((item: any) => {
      const text = String(item?.text || '').trim();
      const createdAt = item?.createdAt || item?.created_at;
      const createdTs = createdAt ? Date.parse(String(createdAt)) : 0;
      return text === expected && Number.isFinite(createdTs) && now - createdTs <= COMMENT_VERIFICATION_LOOKBACK_MS;
    });
  } catch {
    return false;
  }
}

async function waitForPendingCommentVerification(input: {
  contentId: string;
  contentType: 'insight' | 'report' | 'book' | 'methodology';
  expectedText: string;
  timeoutMs?: number;
  intervalMs?: number;
}) {
  const timeoutMs = input.timeoutMs ?? 6_000;
  const intervalMs = input.intervalMs ?? 300;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (
      await verifyPendingComment({
        contentId: input.contentId,
        contentType: input.contentType,
        expectedText: input.expectedText,
      })
    ) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

function installPageAgentVisualSuppressor() {
  let style = document.getElementById(PAGE_AGENT_HIDE_STYLE_ID) as HTMLStyleElement | null;
  let created = false;
  if (!style) {
    style = document.createElement('style');
    style.id = PAGE_AGENT_HIDE_STYLE_ID;
    style.textContent = `
      #playwright-highlight-container,
      #playwright-highlight-container *,
      .playwright-highlight-label {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    created = true;
  }

  const hideContainer = (node?: Element | null) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.id === 'playwright-highlight-container' || node.classList.contains('playwright-highlight-label')) {
      node.style.display = 'none';
      node.style.opacity = '0';
      node.style.visibility = 'hidden';
      node.style.pointerEvents = 'none';
    }
  };

  hideContainer(document.getElementById('playwright-highlight-container'));
  document.querySelectorAll('.playwright-highlight-label').forEach((node) => hideContainer(node));

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          hideContainer(node);
          hideContainer(node.querySelector('#playwright-highlight-container'));
          node.querySelectorAll?.('.playwright-highlight-label').forEach((item) => hideContainer(item));
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (created) {
      style?.remove();
    }
  };
}

function normalizeInternalUrl(target?: string | null) {
  if (!target) return '';
  if (/^https?:\/\//.test(target)) {
    const url = new URL(target, window.location.origin);
    return `${url.pathname}${url.search}`;
  }
  if (target.startsWith('?')) {
    return `${window.location.pathname}${target}`;
  }
  return target;
}

function getCurrentInternalUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

function getCurrentPageId() {
  return document.querySelector<HTMLElement>('[data-yiyu-page]')?.dataset.yiyuPage || '';
}

function findCurrentTourStopIndex(stops: Array<{ url: string; pageId?: string }>) {
  if (!Array.isArray(stops) || !stops.length) return -1;
  const currentUrl = normalizeInternalUrl(getCurrentInternalUrl());
  const currentPageId = getCurrentPageId();
  const exactIndex = stops.findIndex((stop) => normalizeInternalUrl(stop.url) === currentUrl);
  if (exactIndex >= 0) return exactIndex;
  if (currentPageId) {
    return stops.findIndex((stop) => stop.pageId === currentPageId);
  }
  return -1;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 100
) {
  const start = Date.now();
  while (Date.now() - start <= timeoutMs) {
    if (predicate()) return true;
    await sleep(intervalMs);
  }
  return false;
}

function dispatchNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function openInternalUrl(target: string) {
  const next = normalizeInternalUrl(target);
  if (!next.startsWith('/')) {
    throw new Error('仅支持站内地址');
  }
  if (getCurrentInternalUrl() === next) {
    return `当前已经在 ${next}`;
  }

  const appBridge = window.__YIYU_TONG_APP__;
  if (appBridge?.openInternalUrl) {
    appBridge.openInternalUrl(next);
  } else {
    window.history.pushState({}, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  const ready = await waitFor(() => getCurrentInternalUrl() === next, 8000);
  if (!ready) {
    throw new Error(`未能稳定打开 ${next}`);
  }
  await sleep(120);
  return `已在当前标签页打开 ${next}`;
}

async function waitForPage(pageId?: string) {
  if (!pageId) return true;
  const ready = await waitFor(() => getCurrentPageId() === pageId, 8000);
  if (!ready) {
    throw new Error(`未能进入 ${pageId} 页面`);
  }
  await sleep(100);
  return true;
}

async function openNextTourStop(stops: Array<{ label: string; url: string; pageId?: string }>) {
  if (!Array.isArray(stops) || !stops.length) {
    throw new Error('当前导览任务没有可用的站点路线');
  }
  const currentIndex = findCurrentTourStopIndex(stops);
  const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
  const nextStop = stops[nextIndex];
  if (!nextStop) {
    return '导览路线中的主要站点已经全部浏览完成。';
  }
  await openInternalUrl(nextStop.url);
  if (nextStop.pageId) {
    await waitForPage(nextStop.pageId);
  }
  return `已切换到下一站：${nextStop.label}。`;
}

type YiyuTongTourState = {
  currentUrl: string;
  currentPageId: string;
  scrollBucket: number;
  nearBottom: boolean;
  tourStopIndex: number;
  tourStopLabel: string;
  isLastTourStop: boolean;
};

function findSearchInput() {
  return document.querySelector<HTMLInputElement>('[data-yiyu-search="content"]');
}

function findTopicSelect() {
  return document.querySelector<HTMLSelectElement>('select[data-yiyu-filter-topic="content"]');
}

function findYearSelect() {
  return document.querySelector<HTMLSelectElement>('select[data-yiyu-filter-year="content"]');
}

function readTriggerText(selector: string) {
  const trigger = document.querySelector<HTMLElement>(selector);
  const text = String(trigger?.textContent || '')
    .replace(/▾/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function readCurrentTopicValue() {
  const topicSelect = findTopicSelect();
  if (topicSelect) {
    return topicSelect.options[topicSelect.selectedIndex]?.text.trim() || topicSelect.value.trim();
  }
  if (getCurrentPageId() === 'book-library') {
    return readTriggerText('[data-yiyu-filter-topic-trigger="content"]');
  }
  return '';
}

function readCurrentYearValue() {
  const yearSelect = findYearSelect();
  if (yearSelect) {
    return yearSelect.options[yearSelect.selectedIndex]?.text.trim() || yearSelect.value.trim();
  }
  if (getCurrentPageId() === 'book-library') {
    return readTriggerText('[data-yiyu-filter-year-trigger="content"]');
  }
  return '';
}

function readCurrentSortValue() {
  const select = document.querySelector<HTMLSelectElement>('select[data-yiyu-sort="content"]');
  if (select) {
    return select.options[select.selectedIndex]?.text.trim() || select.value.trim();
  }
  const trigger = document.querySelector<HTMLElement>('[data-yiyu-sort-trigger="content"]');
  if (trigger) {
    return readTriggerText('[data-yiyu-sort-trigger="content"]');
  }
  return '';
}

function areStructuredFiltersSatisfied(plan: YiyuTongSameTabExecutionPlan) {
  const filters = plan.filters;
  if (!filters) return true;

  if (filters.searchQuery) {
    const input = findSearchInput();
    if (!input || input.value.trim() !== filters.searchQuery.trim()) {
      return false;
    }
  }

  if (filters.topic) {
    const currentTopic = readCurrentTopicValue();
    if (currentTopic !== filters.topic) {
      return false;
    }
  }

  if (filters.year) {
    const currentYear = readCurrentYearValue();
    if (currentYear !== filters.year) {
      return false;
    }
  }

  if (plan.sortMode) {
    const currentSort = readCurrentSortValue();
    if (currentSort && currentSort !== plan.sortMode) {
      return false;
    }
  }

  return true;
}

function isStructuredSiteStateSatisfied(plan: YiyuTongSameTabExecutionPlan) {
  const expectedUrl = normalizeInternalUrl(plan.expectedUrl);
  const bootstrapUrl = normalizeInternalUrl(plan.bootstrapUrl);
  const expectedPageId = plan.pageId || '';
  const endsOnDifferentDetail = Boolean(expectedUrl && bootstrapUrl && expectedUrl !== bootstrapUrl);
  const urlSatisfied = !expectedUrl || getCurrentInternalUrl() === expectedUrl;
  const pageSatisfied = endsOnDifferentDetail ? true : !expectedPageId || getCurrentPageId() === expectedPageId;
  const filtersSatisfied = endsOnDifferentDetail ? true : areStructuredFiltersSatisfied(plan);
  return urlSatisfied && pageSatisfied && filtersSatisfied;
}

async function setSelectByVisibleText(select: HTMLSelectElement, wanted: string) {
  const option = Array.from(select.options).find((item) => item.text.trim() === wanted || item.value.trim() === wanted);
  if (!option) {
    throw new Error(`未找到选项：${wanted}`);
  }
  select.value = option.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(220);
}

async function clickElement(element: HTMLElement) {
  element.click();
  await sleep(220);
}

async function setBookLibraryTopic(topic: string) {
  const exactOption = document.querySelector<HTMLElement>(`[data-yiyu-filter-topic-option="${CSS.escape(topic)}"]`);
  if (exactOption) {
    await clickElement(exactOption);
    return;
  }

  const trigger = document.querySelector<HTMLElement>('[data-yiyu-filter-topic-trigger="content"]');
  if (!trigger) {
    throw new Error('未找到图书馆标签筛选器');
  }
  await clickElement(trigger);
  await sleep(150);
  const option = document.querySelector<HTMLElement>(`[data-yiyu-filter-topic-option="${CSS.escape(topic)}"]`);
  if (!option) {
    throw new Error(`未找到图书馆标签：${topic}`);
  }
  await clickElement(option);
}

async function setBookLibraryYear(year: string) {
  const exactOption = document.querySelector<HTMLElement>(`[data-yiyu-filter-year-option="${CSS.escape(year)}"]`);
  if (exactOption) {
    await clickElement(exactOption);
    return;
  }

  const trigger = document.querySelector<HTMLElement>('[data-yiyu-filter-year-trigger="content"]');
  if (!trigger) {
    throw new Error('未找到图书馆年份筛选器');
  }
  await clickElement(trigger);
  await sleep(150);
  const option = document.querySelector<HTMLElement>(`[data-yiyu-filter-year-option="${CSS.escape(year)}"]`);
  if (!option) {
    throw new Error(`未找到图书馆年份：${year}`);
  }
  await clickElement(option);
}

async function setSiteFilters(filters: NonNullable<YiyuTongSameTabExecutionPlan['filters']>) {
  if (filters.searchQuery) {
    const searchInput = findSearchInput();
    if (!searchInput) {
      throw new Error('当前页面没有可用搜索框');
    }
    dispatchNativeInputValue(searchInput, filters.searchQuery);
    await sleep(180);
  }

  if (filters.topic) {
    const topicSelect = findTopicSelect();
    if (topicSelect) {
      await setSelectByVisibleText(topicSelect, filters.topic);
    } else if (getCurrentPageId() === 'book-library') {
      await setBookLibraryTopic(filters.topic);
    } else {
      throw new Error(`当前页面没有可用标签筛选器：${filters.topic}`);
    }
  }

  if (filters.year) {
    const yearSelect = findYearSelect();
    if (yearSelect) {
      await setSelectByVisibleText(yearSelect, filters.year);
    } else if (getCurrentPageId() === 'book-library') {
      await setBookLibraryYear(filters.year);
    } else {
      throw new Error(`当前页面没有可用年份筛选器：${filters.year}`);
    }
  }

  await sleep(220);
  return '已完成当前页面筛选。';
}

function findCommentTextarea() {
  return document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="评论"]');
}

function findCommentSubmitButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    /发表评论|提交评论|发送评论/.test(String(button.textContent || '').trim())
  ) || null;
}

function hasVisibleTextFragment(text: string) {
  const normalized = text.replace(/\s+/g, '');
  return Array.from(document.querySelectorAll<HTMLElement>('div, span, p'))
    .filter((node) => isElementVisible(node))
    .some((node) => String(node.textContent || '').replace(/\s+/g, '').includes(normalized));
}

async function fillComment(text: string) {
  const textarea = findCommentTextarea();
  if (!textarea) {
    throw new Error('当前页面未找到评论输入框');
  }
  dispatchNativeInputValue(textarea, text);
  textarea.focus();
  await sleep(160);
  return `已写入评论内容：${text}`;
}

async function submitComment() {
  const button = findCommentSubmitButton();
  if (!button) {
    throw new Error('当前页面未找到发表评论按钮');
  }
  if (button.disabled) {
    throw new Error('发表评论按钮当前不可用');
  }

  const textarea = findCommentTextarea();
  const beforeValue = textarea?.value.trim() || '';
  const successText = '评论已提交，待管理员审核后将显示在评论列表中';
  const beforeSuccessVisible = String(document.body.textContent || '').includes(successText);
  button.click();

  const submitted = await waitFor(() => {
    const messageNode = Array.from(document.querySelectorAll<HTMLElement>('div,span,p')).find((node) =>
      String(node.textContent || '').includes(successText)
    );
    if (messageNode && !beforeSuccessVisible) return true;
    const currentValue = textarea?.value.trim() || '';
    return Boolean(beforeValue && currentValue === '');
  }, 8000, 120);

  if (!submitted) {
    throw new Error('评论提交后页面没有出现成功反馈');
  }

  const target = inferCommentTargetFromUrl();
  if (target) {
    const verified = await waitForPendingCommentVerification({
      ...target,
      expectedText: beforeValue,
    });
    if (!verified) {
      throw new Error('评论提交后未通过后台待审核校验');
    }
    latestVerifiedCommentSubmission = {
      ...target,
      text: beforeValue,
      verifiedAt: Date.now(),
    };
  }

  return '评论已提交，待管理员审核后显示。';
}

function planContainsGraphStep(plan: YiyuTongSameTabExecutionPlan, stepType: YiyuTongSameTabGraphStep['type']) {
  return Boolean(plan.graphSteps?.some((step) => step.type === stepType));
}

function isCommentTaskSatisfied(plan: YiyuTongSameTabExecutionPlan) {
  if (!planContainsGraphStep(plan, 'submit_comment')) return false;
  if (plan.expectedUrl && getCurrentInternalUrl() !== normalizeInternalUrl(plan.expectedUrl)) {
    return false;
  }

  const completionCheck = plan.completionCheck;
  if (
    completionCheck?.type === 'comment_submission' &&
    latestVerifiedCommentSubmission &&
    latestVerifiedCommentSubmission.contentId === completionCheck.contentId &&
    latestVerifiedCommentSubmission.contentType === completionCheck.contentType &&
    latestVerifiedCommentSubmission.text === completionCheck.expectedText.trim()
  ) {
    return true;
  }

  const messageVisible = hasVisibleTextFragment('评论已提交，待管理员审核后将显示在评论列表中');
  return messageVisible;
}

function isPlanCompletionSatisfied(plan: YiyuTongSameTabExecutionPlan) {
  if (isCommentTaskSatisfied(plan)) {
    return {
      ok: true,
      detail: plan.successMessage || '评论已提交，待管理员审核后显示。',
    };
  }
  return null;
}

async function setSortMode(sortMode: string) {
  const select = document.querySelector<HTMLSelectElement>('select[data-yiyu-sort="content"]');
  if (select) {
    await setSelectByVisibleText(select, sortMode);
    return `已切换排序为${sortMode}`;
  }

  const trigger = document.querySelector<HTMLElement>('[data-yiyu-sort-trigger="content"]');
  if (trigger) {
    await clickElement(trigger);
    await sleep(150);
    const option = document.querySelector<HTMLElement>(`[data-yiyu-sort-option="${CSS.escape(sortMode)}"]`);
    if (!option) {
      throw new Error(`未找到排序选项：${sortMode}`);
    }
    await clickElement(option);
    return `已切换排序为${sortMode}`;
  }

  throw new Error('当前页面没有可用排序器');
}

async function goToPage(pageNumber: number) {
  const directButton = document.querySelector<HTMLElement>(`[data-yiyu-pagination-page="${pageNumber}"]`);
  if (directButton) {
    await clickElement(directButton);
    return `已切换到第 ${pageNumber} 页`;
  }

  throw new Error(`当前页面无法直接切换到第 ${pageNumber} 页`);
}

function getVisibleContentCards() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-yiyu-card="content"]'));
}

function scoreCard(card: HTMLElement, title: string) {
  const cardTitle = (card.dataset.yiyuCardTitle || '').trim();
  if (!cardTitle) return 0;
  if (cardTitle === title) return 300 + cardTitle.length;
  if (cardTitle.includes(title) || title.includes(cardTitle)) return 220 + Math.min(cardTitle.length, title.length);
  return 0;
}

async function openContentCard({
  title,
  mode = 'exact',
}: {
  title?: string;
  mode?: 'exact' | 'first' | 'last';
}) {
  const cards = getVisibleContentCards();
  if (!cards.length) {
    throw new Error('当前页面未找到可打开的内容卡片');
  }

  let targetCard: HTMLElement | null = null;

  if (mode === 'first' || !title) {
    targetCard = cards[0] || null;
  } else if (mode === 'last') {
    targetCard = cards[cards.length - 1] || null;
  } else {
    const ranked = cards
      .map((card) => ({ card, score: scoreCard(card, title) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    targetCard = ranked[0]?.card || null;
  }

  if (!targetCard) {
    throw new Error(title ? `未找到标题匹配《${title}》的内容卡片` : '当前页面没有可打开的内容卡片');
  }

  const beforeUrl = getCurrentInternalUrl();
  await clickElement(targetCard);
  const moved = await waitFor(() => getCurrentInternalUrl() !== beforeUrl, 6000);
  if (!moved) {
    throw new Error('卡片点击后页面没有发生变化');
  }

  const nextTitle = targetCard.dataset.yiyuCardTitle || '目标内容';
  return `已打开《${nextTitle}》。`;
}

async function scrollPagePasses(passes = 1) {
  const maxScrollTop = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  ) - window.innerHeight;
  if (maxScrollTop <= 0) {
    return '当前页面无需滚动。';
  }

  for (let pass = 0; pass < Math.max(1, passes); pass += 1) {
    const currentTop = Math.max(0, Math.min(maxScrollTop, window.scrollY));
    const baseStep = Math.max(window.innerHeight * 0.72, 420);
    const targetTop = Math.min(maxScrollTop, currentTop + baseStep);
    if (targetTop <= currentTop + 4) {
      await sleep(180);
      break;
    }
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
    await sleep(900);
  }
  const nearBottom = Math.abs(maxScrollTop - window.scrollY) <= Math.max(64, window.innerHeight * 0.12);
  return nearBottom ? '已滚动到当前页面底部。' : '已继续向下滚动当前页面。';
}

async function scrollSection(sectionId?: string, passes = 1) {
  if (sectionId) {
    const section = document.querySelector<HTMLElement>(`[data-yiyu-section="${CSS.escape(sectionId)}"]`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await sleep(500);
      return `已定位到 ${sectionId} 区域。`;
    }
  }
  return scrollPagePasses(passes);
}

async function expandSection(sectionId: string) {
  const direct = document.querySelector<HTMLElement>(`[data-yiyu-expandable="${CSS.escape(sectionId)}"]`);
  if (direct) {
    await clickElement(direct);
    return `已展开 ${sectionId}。`;
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>('button,[role="button"]'));
  const normalized = sectionId.replace(/\s+/g, '');
  const hit = candidates.find((item) => String(item.textContent || '').replace(/\s+/g, '').includes(normalized));
  if (!hit) {
    throw new Error(`未找到可展开区域：${sectionId}`);
  }
  await clickElement(hit);
  return `已展开 ${sectionId}。`;
}

function findFieldByLabel(labels: string[]) {
  const normalizedLabels = labels.map((item) => item.replace(/\s+/g, ''));
  const labelElements = Array.from(document.querySelectorAll('label'));
  for (const labelEl of labelElements) {
    const text = String(labelEl.textContent || '').replace(/\s+/g, '');
    if (!normalizedLabels.some((item) => text.includes(item))) continue;
    const htmlFor = (labelEl as HTMLLabelElement).htmlFor;
    if (htmlFor) {
      const control = document.getElementById(htmlFor) as HTMLInputElement | HTMLTextAreaElement | null;
      if (control) return control;
    }
    const nested = labelEl.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    if (nested) return nested;
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
  );
  return candidates.find((field) => {
    const placeholder = String(field.placeholder || '').replace(/\s+/g, '');
    return normalizedLabels.some((label) => placeholder.includes(label));
  }) || null;
}

async function fillLocalFormFields(fields: LocalFormFields) {
  const mapping: Array<[string[], string | undefined]> = [
    [['姓名', '联系人', '称呼'], fields.name],
    [['机构', '单位', '组织'], fields.organization],
    [['手机号', '手机', '电话'], fields.phone],
    [['邮箱', 'Email', 'email'], fields.email],
    [['需求', '备注', '描述'], fields.note],
  ];

  let filledCount = 0;
  for (const [labels, value] of mapping) {
    if (!value) continue;
    const field = findFieldByLabel(labels);
    if (!field) continue;
    dispatchNativeInputValue(field, value);
    await sleep(120);
    filledCount += 1;
  }

  if (!filledCount) {
    throw new Error('当前页面未找到可填写的表单字段');
  }
  return `已填写 ${filledCount} 个表单字段。`;
}

function confirmCurrentState(stops?: Array<{ label: string; url: string; pageId?: string }>) {
  const resultsTotal = document.querySelector<HTMLElement>('[data-yiyu-results-total]')?.dataset.yiyuResultsTotal || '';
  const activeTopic = document.querySelector<HTMLElement>('[data-yiyu-active-topic]')?.dataset.yiyuActiveTopic || '';
  const activeYear = document.querySelector<HTMLElement>('[data-yiyu-active-year]')?.dataset.yiyuActiveYear || '';
  const activeSections = Array.from(document.querySelectorAll<HTMLElement>('[data-yiyu-section]'))
    .map((item) => item.dataset.yiyuSection || '')
    .filter(Boolean)
    .slice(0, 16);
  const scrollBucket = getScrollBucket();
  const tourStopIndex = Array.isArray(stops) && stops.length ? findCurrentTourStopIndex(stops) : -1;
  const tourStop = tourStopIndex >= 0 ? stops?.[tourStopIndex] : null;
  return JSON.stringify({
    currentUrl: getCurrentInternalUrl(),
    currentPageId: getCurrentPageId(),
    topic: readCurrentTopicValue(),
    year: readCurrentYearValue(),
    sortMode: readCurrentSortValue(),
    cardCount: getVisibleContentCards().length,
    resultsTotal,
    activeTopic,
    activeYear,
    activeSections,
    scrollBucket,
    nearBottom: scrollBucket >= 11,
    tourStopIndex,
    tourStopLabel: tourStop?.label || '',
    isLastTourStop: tourStopIndex >= 0 && Array.isArray(stops) ? tourStopIndex >= stops.length - 1 : false,
  });
}

function readCurrentTourState(stops: Array<{ label: string; url: string; pageId?: string }>): YiyuTongTourState | null {
  try {
    const parsed = JSON.parse(confirmCurrentState(stops));
    return {
      currentUrl: String(parsed?.currentUrl || ''),
      currentPageId: String(parsed?.currentPageId || ''),
      scrollBucket: Number(parsed?.scrollBucket || 0),
      nearBottom: Boolean(parsed?.nearBottom),
      tourStopIndex: Number.isFinite(Number(parsed?.tourStopIndex)) ? Number(parsed?.tourStopIndex) : -1,
      tourStopLabel: String(parsed?.tourStopLabel || ''),
      isLastTourStop: Boolean(parsed?.isLastTourStop),
    };
  } catch {
    return null;
  }
}

function isElementVisible(element: Element | null) {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getFilledFieldCount() {
  return Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'))
    .filter((field) => isElementVisible(field))
    .filter((field) => {
      const type = String(field.getAttribute('type') || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'reset', 'checkbox', 'radio'].includes(type)) {
        return false;
      }
      return Boolean(String(field.value || '').trim());
    }).length;
}

function getScrollBucket() {
  const maxScrollTop = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  ) - window.innerHeight;
  if (maxScrollTop <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, window.scrollY / maxScrollTop));
  return Math.round(ratio * 12);
}

function getExecutionStateSignature() {
  const cards = getVisibleContentCards();
  const firstTitle = cards[0]?.dataset.yiyuCardTitle || '';
  const lastTitle = cards[cards.length - 1]?.dataset.yiyuCardTitle || '';
  const searchValue = findSearchInput()?.value.trim() || '';
  return JSON.stringify({
    currentUrl: getCurrentInternalUrl(),
    currentPageId: getCurrentPageId(),
    topic: readCurrentTopicValue(),
    year: readCurrentYearValue(),
    sortMode: readCurrentSortValue(),
    searchValue,
    cardCount: cards.length,
    firstTitle,
    lastTitle,
    resultsTotal: document.querySelector<HTMLElement>('[data-yiyu-results-total]')?.dataset.yiyuResultsTotal || '',
    scrollBucket: getScrollBucket(),
    filledFieldCount: getFilledFieldCount(),
    commentValue: findCommentTextarea()?.value.trim() || '',
    commentButtonDisabled: findCommentSubmitButton()?.disabled || false,
  });
}

function prettifyToolName(toolName: string) {
  switch (toolName) {
    case 'open_internal_url':
      return '打开页面';
    case 'set_site_filters':
      return '设置筛选';
    case 'set_sort_mode':
      return '切换排序';
    case 'go_to_page':
      return '切换页码';
    case 'open_next_tour_stop':
      return '切换下一站';
    case 'open_content_card':
      return '打开内容';
    case 'scroll_section':
    case 'scroll_page':
    case 'scroll':
      return '滚动页面';
    case 'expand_section':
      return '展开区域';
    case 'fill_local_form_fields':
      return '填写表单';
    case 'fill_comment':
      return '写入评论';
    case 'submit_comment':
      return '提交评论';
    case 'click_element_by_index':
      return '点击页面元素';
    case 'input_text':
      return '输入文本';
    case 'select_dropdown_option':
      return '选择下拉项';
    case 'wait':
      return '等待页面变化';
    case 'done':
      return '完成任务';
    default:
      return toolName || '执行页面操作';
  }
}

function normalizeProgressDetail(value: unknown) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 220);
}

function buildProgressEntries(
  history: Array<any>,
  liveActivity?: { label: string; detail?: string; status?: 'active' | 'error' }
): YiyuTongProgressEntry[] {
  const entries: YiyuTongProgressEntry[] = [];
  let stepIndex = 0;
  let errorIndex = 0;

  for (const item of history) {
    if (item?.type === 'step') {
      stepIndex += 1;
      const actionName = prettifyToolName(String(item?.action?.name || ''));
      const output = normalizeProgressDetail(item?.action?.output);
      const nextGoal = normalizeProgressDetail(item?.reflection?.next_goal);
      const memory = normalizeProgressDetail(item?.reflection?.memory);
      const detailParts = [output, memory].filter(Boolean);
      entries.push({
        id: `step-${stepIndex}`,
        label: nextGoal || actionName || `步骤 ${stepIndex}`,
        detail: detailParts.join(' · ') || undefined,
        status: 'done',
      });
    } else if (item?.type === 'error') {
      errorIndex += 1;
      entries.push({
        id: `error-${errorIndex}`,
        label: '正在调整操作',
        detail: normalizeProgressDetail(item?.message),
        status: 'active',
      });
    }
  }

  if (liveActivity?.label) {
    entries.push({
      id: 'live-activity',
      label: liveActivity.label,
      detail: liveActivity.detail,
      status: liveActivity.status || 'active',
    });
  }

  return entries.slice(-10);
}

function buildRuntimePrompt(
  plan: YiyuTongSameTabExecutionPlan,
  options: {
    bootstrapped: boolean;
  }
) {
  const promptParts = [
    '你是益语官网当前标签页里的原生网页代理。',
    '请先观察当前页面，再自己规划下一步，并持续执行，直到用户目标真正完成。',
    options.bootstrapped
      ? '如果当前页面已经合适，就继续在当前页面完成任务；如果不合适，也可以切换到更合适的站内页面。'
      : '如果当前页面不合适，可以主动切换到更合适的站内页面。',
    '只在益语官网当前标签页内操作，不要打开外站，不要新建标签页，也不要操作益语通悬浮窗。',
    '你可以自由使用点击、输入、滚动、选择等标准网页动作；站内专用工具只是辅助，不是限制。',
    '完成后立即 done；不要为了显得谨慎而停在半路，也不要做与目标无关的额外动作。',
  ];

  if (plan.filters?.searchQuery) {
    promptParts.push(`任务里提到的搜索词是：${plan.filters.searchQuery}。`);
  }
  if (plan.filters?.topic) {
    promptParts.push(`任务里提到的标签是：${plan.filters.topic}。`);
  }
  if (plan.filters?.year) {
    promptParts.push(`任务里提到的年份是：${plan.filters.year}。`);
  }
  if (plan.sortMode) {
    promptParts.push(`如有需要，可把排序切到：${plan.sortMode}。`);
  }
  if (plan.openTitle) {
    promptParts.push(`如果任务里有明确目标内容，目标标题可能是《${plan.openTitle}》。`);
  } else if (plan.openMode === 'last') {
    promptParts.push('如果你已经筛出了结果，目标通常是打开结果中的最后一项。');
  } else if (plan.openMode === 'first') {
    promptParts.push('如果你已经筛出了结果，目标通常是打开结果中的第一项。');
  }

  if (plan.bootstrapUrl) {
    promptParts.push(`已知一个可能的站内起点是：${plan.bootstrapUrl}。只有在这能更快完成任务时再使用。`);
  }

  if (plan.prompt) {
    promptParts.push(`用户原始任务：${plan.prompt}`);
  }

  if (plan.kind === 'site_tour' && Array.isArray(plan.tourStops) && plan.tourStops.length) {
    const route = plan.tourStops
      .map((stop, index) => `${index + 1}.${stop.label}（${stop.url}）`)
      .join(' -> ');
    promptParts.push(`这是一个整站导览任务，推荐路线是：${route}。`);
    promptParts.push('请把每个页面都当成一个单独站点停靠点：先进入页面，再多次向下滚动，确认主要内容已经看过。');
    promptParts.push('每次滚动后都结合当前页面状态继续判断是否还需要停留；请频繁调用 confirm_current_state 查看当前页、导览站点序号和滚动进度。');
    promptParts.push('如果 confirm_current_state 显示 nearBottom=true 且 isLastTourStop=false，请优先调用 open_next_tour_stop 切到路线中的下一站。');
    promptParts.push('如果 confirm_current_state 显示 nearBottom=true 且 isLastTourStop=true，请直接 done，表示整站导览已经完成。');
    promptParts.push('除非页面里出现特别有代表性的二级页入口，否则不要在同一个页面里无限重复滚动，也不要滚到底后又自动回到顶部。');
  }

  return promptParts.join(' ');
}

async function executeGraphStep(step: YiyuTongSameTabGraphStep) {
  switch (step.type) {
    case 'open_url':
      await openInternalUrl(step.target);
      if (step.pageId) {
        await waitForPage(step.pageId);
      }
      return `已打开 ${step.target}`;
    case 'set_filters':
      return setSiteFilters(step.filters);
    case 'set_sort_mode':
      return setSortMode(step.sortMode);
    case 'go_to_page':
      return goToPage(step.pageNumber);
    case 'open_content_card':
      return openContentCard({ title: step.title, mode: step.mode || (step.title ? 'exact' : 'first') });
    case 'scroll_section':
      return scrollSection(step.sectionId, step.passes || 1);
    case 'expand_section':
      return expandSection(step.sectionId);
    case 'fill_local_form_fields':
      return fillLocalFormFields(step.fields);
    case 'fill_comment':
      return fillComment(step.text);
    case 'submit_comment':
      return submitComment();
    default:
      throw new Error('未支持的任务步骤');
  }
}

async function executeStructuredGraphSteps(
  plan: YiyuTongSameTabExecutionPlan,
  onPhaseChange?: (phase: YiyuTongTaskPhase, detail?: string) => void
) {
  const graphSteps = plan.graphSteps || [];
  for (const step of graphSteps) {
    if (step.type === 'open_url') {
      onPhaseChange?.('locating', step.detail || `正在进入 ${step.target}`);
    } else {
      onPhaseChange?.('acting', step.detail || '正在执行页面操作');
    }
    await executeGraphStep(step);
  }
  onPhaseChange?.('done', plan.successMessage || '已完成页面操作。');
  return { ok: true as const, data: plan.successMessage || '已完成页面操作。' };
}

async function executeStructuredSiteSteps(
  plan: YiyuTongSameTabExecutionPlan,
  onPhaseChange?: (phase: YiyuTongTaskPhase, detail?: string) => void
) {
  if (plan.graphSteps?.length) {
    return executeStructuredGraphSteps(plan, onPhaseChange);
  }
  onPhaseChange?.('locating', '正在定位相关页面');
  if (plan.bootstrapUrl) {
    await openInternalUrl(plan.bootstrapUrl);
  }
  if (plan.pageId) {
    await waitForPage(plan.pageId);
  }

  onPhaseChange?.('acting', '正在操作页面');
  if (plan.filters && (plan.filters.searchQuery || plan.filters.topic || plan.filters.year)) {
    await setSiteFilters(plan.filters);
  }
  if (plan.sortMode) {
    await setSortMode(plan.sortMode);
  }
  if (typeof plan.pageNumber === 'number' && plan.pageNumber > 1) {
    await goToPage(plan.pageNumber);
  }

  if (plan.openMode === 'exact' && plan.openTitle) {
    await openContentCard({ title: plan.openTitle, mode: 'exact' });
  } else if (plan.openMode === 'first') {
    await openContentCard({ mode: 'first' });
  } else if (plan.openMode === 'last') {
    await openContentCard({ mode: 'last' });
  }

  onPhaseChange?.('done', plan.successMessage || '已完成页面操作。');
  return { ok: true as const, data: plan.successMessage || '已完成页面操作。' };
}

async function executeStructuredTourSteps(
  plan: YiyuTongSameTabExecutionPlan,
  onPhaseChange?: (phase: YiyuTongTaskPhase, detail?: string) => void
) {
  const stops = plan.tourStops || [];
  onPhaseChange?.('locating', '正在依次定位网站主要板块');
  for (const stop of stops) {
    await openInternalUrl(stop.url);
    if (stop.pageId) {
      await waitForPage(stop.pageId);
    }
    onPhaseChange?.('acting', `正在浏览${stop.label}${stop.summary ? `：${stop.summary}` : ''}`);
    await scrollPagePasses(stop.scrollPasses || 1);
  }
  onPhaseChange?.('done', plan.successMessage || '已带你浏览网站主要板块。');
  return { ok: true as const, data: plan.successMessage || '已带你浏览网站主要板块。' };
}

export async function executeYiyuTongSiteTask({
  plan,
  ignoredElements = [],
  onPhaseChange,
  onProgressChange,
}: ExecuteYiyuTongSiteTaskOptions) {
  latestVerifiedCommentSubmission = null;
  onPhaseChange?.('understanding', plan.kind === 'site_tour' ? '识别到你想浏览网站主要板块。' : '识别到你想让我直接在官网里完成操作。');

  const [{ PageAgentCore, tool }, controllerModule] = await Promise.all([
    import('page-agent'),
    import('@page-agent/page-controller'),
  ]);

  const { PageController } = controllerModule as typeof import('@page-agent/page-controller');
  const resolvedIgnored = ignoredElements
    .map((item) => (typeof item === 'function' ? item() : item))
    .filter(Boolean) as Element[];

  const pageController = new PageController({
    enableMask: false,
    interactiveBlacklist: resolvedIgnored,
    highlightOpacity: 0,
    highlightLabelOpacity: 0,
  });

  const removePageAgentVisualSuppressor = installPageAgentVisualSuppressor();

  const agent = new PageAgentCore({
    baseURL: '/api/auth/assistant/page-agent',
    model: 'doubao-seed-2-0-lite-260215',
    apiKey: 'browser-proxied',
    language: 'zh-CN',
    maxSteps: EXECUTION_MAX_STEPS,
    stepDelay: 0.08,
    pageController,
    customFetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
      const rawBody = typeof init?.body === 'string' ? init.body : '{}';
      return proxyYiyuTongPageAgent(JSON.parse(rawBody), init?.signal || undefined);
    },
    customTools: {
      ask_user: null,
      open_internal_url: tool({
        description: '在当前标签页内打开一个明确的站内地址。',
        inputSchema: z.object({
          target: z.string().min(1),
        }),
        execute: async ({ target }: { target: string }) => openInternalUrl(target),
      }),
      set_site_filters: tool({
        description: '在当前列表页中设置搜索关键词、标签或年份筛选。',
        inputSchema: z.object({
          searchQuery: z.string().optional(),
          topic: z.string().optional(),
          year: z.string().optional(),
        }),
        execute: async (payload: { searchQuery?: string; topic?: string; year?: string }) => setSiteFilters(payload),
      }),
      set_sort_mode: tool({
        description: '切换当前列表页的排序方式。',
        inputSchema: z.object({
          sortMode: z.string().min(1),
        }),
        execute: async ({ sortMode }: { sortMode: string }) => setSortMode(sortMode),
      }),
      go_to_page: tool({
        description: '切换到列表页中的指定页码。',
        inputSchema: z.object({
          pageNumber: z.number().int().positive(),
        }),
        execute: async ({ pageNumber }: { pageNumber: number }) => goToPage(pageNumber),
      }),
      open_next_tour_stop: tool({
        description: '在整站导览任务中切到路线里的下一站页面。',
        inputSchema: z.object({}),
        execute: async () => openNextTourStop(plan.tourStops || []),
      }),
      open_content_card: tool({
        description: '打开当前列表中某个内容卡片，支持按标题精确打开、打开第一项或最后一项。',
        inputSchema: z.object({
          title: z.string().optional(),
          mode: z.enum(['exact', 'first', 'last']).default('exact'),
        }),
        execute: async ({ title, mode }: { title?: string; mode?: 'exact' | 'first' | 'last' }) =>
          openContentCard({ title, mode }),
      }),
      scroll_section: tool({
        description: '滚动当前页面或定位到某个内容区，适合导览任务。',
        inputSchema: z.object({
          sectionId: z.string().optional(),
          passes: z.number().int().positive().optional(),
        }),
        execute: async ({ sectionId, passes }: { sectionId?: string; passes?: number }) =>
          scrollSection(sectionId, passes || 1),
      }),
      scroll_page: tool({
        description: '滚动当前页面，适合导览或浏览任务。',
        inputSchema: z.object({
          passes: z.number().int().positive().optional(),
        }),
        execute: async ({ passes }: { passes?: number }) => scrollSection(undefined, passes || 1),
      }),
      expand_section: tool({
        description: '展开当前页面中的某个可折叠区域。',
        inputSchema: z.object({
          sectionId: z.string().min(1),
        }),
        execute: async ({ sectionId }: { sectionId: string }) => expandSection(sectionId),
      }),
      confirm_current_state: tool({
        description: '读取当前页面、URL、筛选和卡片状态，确认是否已经达到目标。',
        inputSchema: z.object({}),
        execute: async () => confirmCurrentState(plan.tourStops || []),
      }),
      fill_local_form_fields: tool({
        description: '在当前标签页内填写已经识别出的本地表单字段。',
        inputSchema: z.object({
          name: z.string().optional(),
          organization: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          note: z.string().optional(),
        }),
        execute: async (fields: LocalFormFields) => fillLocalFormFields(fields),
      }),
      fill_comment: tool({
        description: '在当前详情页的评论输入框中写入评论内容。',
        inputSchema: z.object({
          text: z.string().min(1),
        }),
        execute: async ({ text }: { text: string }) => fillComment(text),
      }),
      submit_comment: tool({
        description: '点击当前页面中的发表评论按钮，提交已经写好的评论。',
        inputSchema: z.object({}),
        execute: async () => submitComment(),
      }),
    },
    onBeforeTask: () => {
      onPhaseChange?.('planning', plan.kind === 'site_tour' ? '正在规划整站导览路径。' : '正在规划页面操作步骤。');
    },
    onBeforeStep: async (_agent: unknown, stepCount: number) => {
      if (stepCount === 0) {
        onPhaseChange?.('locating', plan.kind === 'site_tour' ? '正在定位第一个要浏览的板块。' : '正在定位相关页面和内容。');
        return;
      }
      onPhaseChange?.('acting', plan.kind === 'site_tour' ? '正在逐页滚动浏览网站。' : '正在操作页面。');
    },
    onAfterTask: async (_agent: unknown, result: { success: boolean; data: string }) => {
      if (result.success) {
        onPhaseChange?.('done', result.data);
      } else {
        onPhaseChange?.('error', result.data);
      }
    },
  });

  const activityListener = (event: Event) => {
    const detail = (event as CustomEvent<{ type: string; tool?: string; message?: string }>).detail;
    if (!detail) return;
    if (detail.type === 'thinking') {
      onPhaseChange?.('planning', '正在继续思考下一步操作。');
      return;
    }
    if (detail.type === 'executing') {
      const toolName = detail.tool ? `正在执行 ${detail.tool}` : '正在执行页面操作';
      onPhaseChange?.('acting', toolName);
      return;
    }
    if (detail.type === 'retrying') {
      onPhaseChange?.('acting', '当前步骤需要重试，我会继续完成。');
      return;
    }
    if (detail.type === 'error' && detail.message) {
      onPhaseChange?.('acting', detail.message);
    }
  };
  agent.addEventListener('activity', activityListener as EventListener);
  let stopDynamicWatchdog: (() => void) | null = null;
  let activityProgressListener: EventListener | null = null;
  let statusHeartbeatListener: EventListener | null = null;
  let historyProgressListener: EventListener | null = null;
  let liveActivity: { label: string; detail?: string; status?: 'active' | 'error' } | undefined;
  const tourBottomHitCount = new Map<number, number>();
  let pendingTourProgress = false;
  let autoCompletedTour = '';
  let lastTourNudgeAt = 0;

  try {
    const bootstrapped = false;

    let lastHeartbeatAt = Date.now();
    let lastProgressAt = Date.now();
    const executionStartedAt = Date.now();
    let lastStateSignature = getExecutionStateSignature();
    let lastExecutedToolKey = '';
    let repeatedToolCount = 0;
    let watchdogStopped = false;
    let watchdogInterval: number | null = null;
    let watchdogReject: ((reason?: any) => void) | null = null;

    const markHeartbeat = () => {
      lastHeartbeatAt = Date.now();
    };

    const markProgress = () => {
      lastProgressAt = Date.now();
      lastHeartbeatAt = Date.now();
      repeatedToolCount = 0;
    };

    const syncExecutionState = () => {
      const nextSignature = getExecutionStateSignature();
      if (nextSignature !== lastStateSignature) {
        lastStateSignature = nextSignature;
        markProgress();
        return true;
      }
      return false;
    };

    const stopExecutionWatchdog = () => {
      if (watchdogStopped) return;
      watchdogStopped = true;
      if (watchdogInterval !== null) {
        window.clearInterval(watchdogInterval);
        watchdogInterval = null;
      }
      watchdogReject = null;
    };
    stopDynamicWatchdog = stopExecutionWatchdog;

    const failExecutionWatchdog = (message: string) => {
      if (watchdogStopped) return;
      const reject = watchdogReject;
      stopExecutionWatchdog();
      try {
        agent.stop();
      } catch {
        // ignore
      }
      reject?.(new Error(message));
    };

    const maybeProgressTour = async (forceScroll = false) => {
      if (plan.kind !== 'site_tour' || !plan.tourStops?.length || watchdogStopped || pendingTourProgress) return;
      pendingTourProgress = true;
      try {
        const state = readCurrentTourState(plan.tourStops);
        if (!state || state.tourStopIndex < 0) return;
        if (!state.nearBottom) {
          tourBottomHitCount.set(state.tourStopIndex, 0);
          if (!forceScroll) return;
          liveActivity = {
            label: '继续浏览当前板块',
            detail: `正在继续向下浏览${state.tourStopLabel || '当前板块'}。`,
            status: 'active',
          };
          onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
          await scrollPagePasses(1);
          syncExecutionState();
          lastTourNudgeAt = Date.now();
          onPhaseChange?.('acting', `正在继续浏览${state.tourStopLabel || '当前板块'}。`);
          return;
        }

        const nextHits = (tourBottomHitCount.get(state.tourStopIndex) || 0) + 1;
        tourBottomHitCount.set(state.tourStopIndex, nextHits);
        if (nextHits < 2) return;

        if (state.isLastTourStop) {
          autoCompletedTour = plan.successMessage || '已带你快速浏览完网站的主要板块。';
          liveActivity = {
            label: '导览完成',
            detail: autoCompletedTour,
            status: 'active',
          };
          onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
          try {
            agent.stop();
          } catch {
            // ignore
          }
          return;
        }

        liveActivity = {
          label: '切换下一站',
          detail: `已看完${state.tourStopLabel || '当前板块'}的主要内容，正在继续下一站。`,
          status: 'active',
        };
        onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
        await openNextTourStop(plan.tourStops);
        tourBottomHitCount.set(state.tourStopIndex, 0);
        syncExecutionState();
        lastTourNudgeAt = Date.now();
        onPhaseChange?.('acting', `已浏览完${state.tourStopLabel || '当前板块'}，正在继续下一站。`);
      } finally {
        pendingTourProgress = false;
      }
    };

    activityProgressListener = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; tool?: string; input?: unknown; message?: string }>).detail;
      if (!detail) return;
      markHeartbeat();
      if (detail.type === 'executed') {
        const toolKey = `${detail.tool || 'unknown'}:${JSON.stringify(detail.input ?? null)}`;
        const progressedNow = syncExecutionState();
        if (!progressedNow) {
          repeatedToolCount = toolKey === lastExecutedToolKey ? repeatedToolCount + 1 : 1;
          window.setTimeout(() => {
            if (!watchdogStopped) {
              syncExecutionState();
            }
          }, 180);
          window.setTimeout(() => {
            if (!watchdogStopped) {
              syncExecutionState();
            }
          }, 520);
        } else {
          repeatedToolCount = 0;
        }
        lastExecutedToolKey = toolKey;
        liveActivity = {
          label: prettifyToolName(String(detail.tool || '')),
          detail: normalizeProgressDetail(`已执行 ${prettifyToolName(String(detail.tool || ''))}`),
          status: 'active',
        };
        onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
        if (plan.kind === 'site_tour' && /scroll|confirm_current_state|open_next_tour_stop/i.test(String(detail.tool || ''))) {
          void maybeProgressTour();
        }
      } else if (detail.type === 'thinking') {
        liveActivity = {
          label: '正在思考下一步',
          detail: '正在结合当前页面状态继续规划操作。',
          status: 'active',
        };
        onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
      } else if (detail.type === 'executing') {
        liveActivity = {
          label: prettifyToolName(String(detail.tool || '执行页面操作')),
          detail: normalizeProgressDetail(detail.tool ? `正在执行 ${prettifyToolName(String(detail.tool))}` : '正在执行页面操作。'),
          status: 'active',
        };
        onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
      } else if (detail.type === 'retrying') {
        liveActivity = {
          label: '正在重试',
          detail: '页面状态还不稳定，正在继续尝试。',
          status: 'active',
        };
        onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
      } else if (detail.type === 'error') {
        liveActivity = {
          label: '正在调整操作',
          detail: normalizeProgressDetail(detail.message),
          status: 'active',
        };
        onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
      }
    };

    statusHeartbeatListener = () => {
      markHeartbeat();
    };

    historyProgressListener = () => {
      markHeartbeat();
      syncExecutionState();
      onProgressChange?.(buildProgressEntries(agent.history as any[], liveActivity));
    };

    agent.addEventListener('activity', activityProgressListener);
    agent.addEventListener('statuschange', statusHeartbeatListener);
    agent.addEventListener('historychange', historyProgressListener);

    const execution = agent.execute(buildRuntimePrompt(plan, { bootstrapped }));
    let completionProbeInterval: number | null = null;
    const completionProbe = new Promise<{ success: true; data: string }>((resolve) => {
      completionProbeInterval = window.setInterval(() => {
        if (autoCompletedTour) {
          if (completionProbeInterval !== null) {
            window.clearInterval(completionProbeInterval);
            completionProbeInterval = null;
          }
          resolve({
            success: true,
            data: autoCompletedTour,
          });
          return;
        }
        const satisfied = isPlanCompletionSatisfied(plan);
        if (!satisfied?.ok) return;
        if (completionProbeInterval !== null) {
          window.clearInterval(completionProbeInterval);
          completionProbeInterval = null;
        }
        try {
          agent.stop();
        } catch {
          // ignore
        }
        resolve({
          success: true,
          data: satisfied.detail,
        });
      }, 300);
    });
    const watchdog = new Promise<never>((_, reject) => {
      watchdogReject = reject;
      watchdogInterval = window.setInterval(() => {
        const now = Date.now();
        syncExecutionState();

        if (now - lastHeartbeatAt > EXECUTION_HEARTBEAT_GRACE_MS) {
          failExecutionWatchdog('页面操作暂时卡住了，长时间没有新的动作。');
          return;
        }

        if (plan.kind === 'site_tour' && now - lastProgressAt > TOUR_IDLE_NUDGE_MS && now - lastTourNudgeAt > TOUR_IDLE_NUDGE_MS) {
          void maybeProgressTour(true);
          return;
        }

        if (now - lastProgressAt > EXECUTION_PROGRESS_GRACE_MS) {
          failExecutionWatchdog('页面操作长时间没有新的进展，已自动停止。');
          return;
        }

        if (repeatedToolCount >= EXECUTION_LOOP_REPEAT_LIMIT && now - lastProgressAt > 4_000) {
          failExecutionWatchdog('页面操作出现了重复循环，已自动停止。');
          return;
        }

        if (now - executionStartedAt > EXECUTION_GLOBAL_FUSE_MS) {
          failExecutionWatchdog('页面操作已达到安全上限，已自动停止。');
        }
      }, EXECUTION_WATCHDOG_INTERVAL_MS);
    });

    const result = await Promise.race([execution, completionProbe, watchdog]);
    if (completionProbeInterval !== null) {
      window.clearInterval(completionProbeInterval);
      completionProbeInterval = null;
    }
    stopExecutionWatchdog();
    if (activityProgressListener) agent.removeEventListener('activity', activityProgressListener);
    if (statusHeartbeatListener) agent.removeEventListener('statuschange', statusHeartbeatListener);
    if (historyProgressListener) agent.removeEventListener('historychange', historyProgressListener);
    if (result.success) {
      onProgressChange?.(
        buildProgressEntries(agent.history as any[], {
          label: '已完成',
          detail: normalizeProgressDetail(plan.successMessage || result.data || '已完成页面操作。'),
          status: 'active',
        })
      );
      return { ok: true, data: plan.successMessage || result.data || '已完成页面操作。' };
    }

    onProgressChange?.(
      buildProgressEntries(agent.history as any[], {
        label: '执行未完成',
        detail: normalizeProgressDetail(result.data || '未能稳定完成页面操作'),
        status: 'error',
      })
    );
    return {
      ok: false,
      error: result.data || '未能稳定完成页面操作',
    };
  } catch (error: any) {
    onPhaseChange?.('error', error?.message || '执行失败');
    onProgressChange?.([
      {
        id: 'fatal-error',
        label: '执行失败',
        detail: normalizeProgressDetail(error?.message || '执行失败'),
        status: 'error',
      },
    ]);
    return { ok: false, error: error?.message || '执行失败' };
  } finally {
    agent.removeEventListener('activity', activityListener as EventListener);
    stopDynamicWatchdog?.();
    if (activityProgressListener) agent.removeEventListener('activity', activityProgressListener);
    if (statusHeartbeatListener) agent.removeEventListener('statuschange', statusHeartbeatListener);
    if (historyProgressListener) agent.removeEventListener('historychange', historyProgressListener);
    try {
      await pageController.cleanUpHighlights();
    } catch {
      // ignore
    }
    removePageAgentVisualSuppressor();
    agent.dispose();
  }
}
