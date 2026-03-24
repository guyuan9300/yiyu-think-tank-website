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
}

type LocalFormFields = {
  name?: string;
  organization?: string;
  phone?: string;
  email?: string;
  note?: string;
};

const EXECUTION_MAX_STEPS = 120;
const EXECUTION_HEARTBEAT_GRACE_MS = 12_000;
const EXECUTION_PROGRESS_GRACE_MS = 18_000;
const EXECUTION_GLOBAL_FUSE_MS = 240_000;
const EXECUTION_WATCHDOG_INTERVAL_MS = 600;
const EXECUTION_LOOP_REPEAT_LIMIT = 5;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

  return '评论已提交。';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await sleep(350);
    window.scrollTo({ top: maxScrollTop * 0.45, behavior: 'smooth' });
    await sleep(500);
    window.scrollTo({ top: maxScrollTop, behavior: 'smooth' });
    await sleep(650);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await sleep(300);
  return '已完成当前页面滚动浏览。';
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

function confirmCurrentState() {
  const resultsTotal = document.querySelector<HTMLElement>('[data-yiyu-results-total]')?.dataset.yiyuResultsTotal || '';
  const activeTopic = document.querySelector<HTMLElement>('[data-yiyu-active-topic]')?.dataset.yiyuActiveTopic || '';
  const activeYear = document.querySelector<HTMLElement>('[data-yiyu-active-year]')?.dataset.yiyuActiveYear || '';
  const activeSections = Array.from(document.querySelectorAll<HTMLElement>('[data-yiyu-section]'))
    .map((item) => item.dataset.yiyuSection || '')
    .filter(Boolean)
    .slice(0, 16);
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
  });
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

function hasStructuredSiteSteps(plan: YiyuTongSameTabExecutionPlan) {
  return Boolean(
    plan.graphSteps?.length ||
    plan.bootstrapUrl ||
      plan.filters?.searchQuery ||
      plan.filters?.topic ||
      plan.filters?.year ||
      plan.sortMode ||
      plan.pageNumber ||
      (plan.openMode && plan.openMode !== 'none')
  );
}

function isDirectOpenTask(plan: YiyuTongSameTabExecutionPlan) {
  if (plan.graphSteps?.length) return false;
  const hasFilters = Boolean(
    plan.filters?.searchQuery ||
      plan.filters?.topic ||
      plan.filters?.year ||
      plan.sortMode ||
      plan.pageNumber
  );
  return !hasFilters && (!plan.openMode || plan.openMode === 'none');
}

function renderGraphStepPrompt(step: YiyuTongSameTabGraphStep) {
  switch (step.type) {
    case 'open_url':
      return `先使用 open_internal_url 打开 "${step.target}"。`;
    case 'set_filters': {
      const parts = [];
      if (step.filters.searchQuery) parts.push(`搜索词“${step.filters.searchQuery}”`);
      if (step.filters.topic) parts.push(`标签“${step.filters.topic}”`);
      if (step.filters.year) parts.push(`年份“${step.filters.year}”`);
      return `然后设置当前列表页筛选：${parts.join('、')}。`;
    }
    case 'set_sort_mode':
      return `然后把当前列表排序切换为“${step.sortMode}”。`;
    case 'go_to_page':
      return `然后切换到第 ${step.pageNumber} 页。`;
    case 'open_content_card':
      if (step.title) {
        return `然后打开标题为《${step.title}》的内容卡片。`;
      }
      if (step.mode === 'last') return '然后打开当前结果列表里的最后一项。';
      if (step.mode === 'first') return '然后打开当前结果列表里的第一项。';
      return '然后打开目标内容卡片。';
    case 'scroll_section':
      return step.sectionId
        ? `然后滚动到 ${step.sectionId} 区域。`
        : '然后从上到下滚动浏览当前页面。';
    case 'expand_section':
      return `然后展开 ${step.sectionId} 区域。`;
    case 'fill_local_form_fields':
      return '然后把当前已知表单字段填写进页面。';
    case 'fill_comment':
      return `然后在评论框里写入“${step.text}”。`;
    case 'submit_comment':
      return '最后点击发表评论按钮，但不要做额外无关操作。';
    default:
      return '';
  }
}

async function preBootstrapPlan(plan: YiyuTongSameTabExecutionPlan) {
  const bootstrapUrl = normalizeInternalUrl(plan.bootstrapUrl);
  if (!bootstrapUrl) {
    return false;
  }

  if (getCurrentInternalUrl() !== bootstrapUrl) {
    await openInternalUrl(bootstrapUrl);
  }

  if (plan.pageId) {
    await waitForPage(plan.pageId);
  }

  return true;
}

function buildRuntimePrompt(
  plan: YiyuTongSameTabExecutionPlan,
  options: {
    bootstrapped: boolean;
  }
) {
  if (plan.kind === 'site_tour') {
    return buildPrompt(plan);
  }

  const promptParts = [
    '你是益语通在益语官网中的页面执行器。',
    '你的任务是在当前网站同一标签页内连续完成页面操作，让网站真正动起来。',
    options.bootstrapped
      ? '当前已经进入了正确的站内页面，请优先在当前页继续完成筛选、滚动、切换和打开详情，不要重复打开同一个页面。'
      : '如果还不在目标页，可以先合理打开目标页，再继续执行后续操作。',
    '优先使用站内专用工具；如果当前页确实需要进一步探索，可合理使用页面中已可见的控件。',
    '只在同站同标签页内操作，不要打开外站，不要新建标签页，不要操作益语通悬浮窗。',
    '如果需要点击页面元素，请使用 click_element_by_index；如果需要输入文本，请使用 input_text；如果需要选择下拉，请使用 select_dropdown_option。',
    '任务完成后立即调用 done，不要额外闲聊。',
  ];

  if (plan.graphSteps?.length) {
    promptParts.push('请严格按照下面的顺序步骤依次完成，不要跳步，不要提前结束：');
    for (const [index, step] of plan.graphSteps.entries()) {
      promptParts.push(`${index + 1}. ${renderGraphStepPrompt(step)}`);
    }
  }

  if (plan.filters?.searchQuery) {
    promptParts.push(`当前任务包含搜索词：${plan.filters.searchQuery}。`);
  }
  if (plan.filters?.topic) {
    promptParts.push(`当前任务需要筛选标签：${plan.filters.topic}。`);
  }
  if (plan.filters?.year) {
    promptParts.push(`当前任务需要筛选年份：${plan.filters.year}。`);
  }
  if (plan.sortMode) {
    promptParts.push(`当前任务需要切换排序：${plan.sortMode}。`);
  }
  if (plan.openTitle) {
    promptParts.push(`当前任务的目标标题是《${plan.openTitle}》。`);
  } else if (plan.openMode === 'last') {
    promptParts.push('当前任务需要打开筛选结果中的最后一项。');
  } else if (plan.openMode === 'first') {
    promptParts.push('当前任务需要打开筛选结果中的第一项。');
  }

  if (plan.prompt) {
    promptParts.push(`用户原始任务要求：${plan.prompt}`);
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

function buildPrompt(plan: YiyuTongSameTabExecutionPlan) {
  if (plan.kind === 'site_tour') {
    return [
      '你是益语通在益语官网中的页面执行器。',
      '现在要带用户在当前标签页内浏览整个网站。',
      '请优先使用 open_internal_url、scroll_section、confirm_current_state 等工具完成多页导览。',
      '不要打开外站，不要新建标签页，不要操作益语通悬浮窗。',
      '如果需要点击页面元素，请使用 click_element_by_index，不要返回 click 这种别名。',
      plan.prompt,
      '完成整个导览后再调用 done，并用一句中文说明已完成。',
    ].join(' ');
  }

  return [
    '你是益语通在益语官网中的页面执行器。',
    '你的目标是在当前网站同一标签页内尽快完成找、跳、筛、开、滚动、展开等页面操作。',
    '优先使用站内专用工具，但如果当前页确实需要进一步探索，可以合理使用页面已有控件完成任务。',
    '不要打开外站，不要新建标签页，不要操作益语通悬浮窗。',
    '如果需要点击页面元素，请使用 click_element_by_index；如果需要输入文本，请使用 input_text；如果需要选择下拉，请使用 select_dropdown_option。',
    '如果已经到达目标状态，请尽快调用 done，不要继续做无关尝试。',
    plan.prompt,
  ].join(' ');
}

export async function executeYiyuTongSiteTask({
  plan,
  ignoredElements = [],
  onPhaseChange,
}: ExecuteYiyuTongSiteTaskOptions) {
  onPhaseChange?.('understanding', plan.kind === 'site_tour' ? '识别到你想浏览网站主要板块。' : '识别到你想让我直接在官网里完成操作。');
  const hasGraphSteps = Boolean(plan.graphSteps?.length);
  const structuredTask = plan.kind === 'site_tour' || hasStructuredSiteSteps(plan);

  if (hasGraphSteps) {
    try {
      return await executeStructuredGraphSteps(plan, onPhaseChange);
    } catch (error: any) {
      onPhaseChange?.('error', error?.message || '执行失败');
      return { ok: false as const, error: error?.message || '执行失败' };
    }
  }

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

  const expectedUrl = normalizeInternalUrl(plan.expectedUrl);
  const bootstrapUrl = normalizeInternalUrl(plan.bootstrapUrl);
  const expectedPageId = plan.pageId || '';

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
    instructions: {
      system: [
        '你是益语通在益语官网中的同标签页页面执行器。',
        '你的首要目标是替用户完成页面操作，而不是解释原理。',
        '优先使用站内专用工具，但允许在当前页面合理探索可见控件来完成任务。',
        '不要打开外站，不要新建标签页，不要操作益语通悬浮窗。',
        '如果页面已经达到目标状态，应立即调用 done。',
        '如果你需要点击页面元素，请使用 click_element_by_index；如果需要输入，请使用 input_text；如果需要选择下拉，请使用 select_dropdown_option。',
      ].join(''),
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
        execute: async () => confirmCurrentState(),
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

  try {
    let bootstrapped = false;
    if (plan.kind === 'site_task' && plan.bootstrapUrl) {
      onPhaseChange?.('locating', '正在进入任务起始页面。');
      bootstrapped = await preBootstrapPlan(plan);
    }

    if (plan.kind === 'site_task' && isDirectOpenTask(plan) && isStructuredSiteStateSatisfied(plan)) {
      onPhaseChange?.('done', plan.successMessage || '已完成页面操作。');
      return { ok: true as const, data: plan.successMessage || '已完成页面操作。' };
    }

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

    activityProgressListener = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; tool?: string; input?: unknown }>).detail;
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
      }
    };

    statusHeartbeatListener = () => {
      markHeartbeat();
    };

    historyProgressListener = () => {
      markHeartbeat();
      syncExecutionState();
    };

    agent.addEventListener('activity', activityProgressListener);
    agent.addEventListener('statuschange', statusHeartbeatListener);
    agent.addEventListener('historychange', historyProgressListener);

    const execution = agent.execute(buildRuntimePrompt(plan, { bootstrapped }));
    const watchdog = new Promise<never>((_, reject) => {
      watchdogReject = reject;
      watchdogInterval = window.setInterval(() => {
        const now = Date.now();
        syncExecutionState();

        if (now - lastHeartbeatAt > EXECUTION_HEARTBEAT_GRACE_MS) {
          failExecutionWatchdog('页面操作暂时卡住了，长时间没有新的动作。');
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

    const result = await Promise.race([execution, watchdog]);
    stopExecutionWatchdog();
    if (activityProgressListener) agent.removeEventListener('activity', activityProgressListener);
    if (statusHeartbeatListener) agent.removeEventListener('statuschange', statusHeartbeatListener);
    if (historyProgressListener) agent.removeEventListener('historychange', historyProgressListener);
    const landedUrl = getCurrentInternalUrl();
    const endsOnDifferentDetail = Boolean(expectedUrl && bootstrapUrl && expectedUrl !== bootstrapUrl);
    const urlSatisfied = !expectedUrl || landedUrl === expectedUrl;
    const pageSatisfied = endsOnDifferentDetail ? true : !expectedPageId || getCurrentPageId() === expectedPageId;
    const structuredSatisfied = plan.kind === 'site_tour' ? true : !structuredTask || isStructuredSiteStateSatisfied(plan);

    if (result.success && urlSatisfied && pageSatisfied && structuredSatisfied) {
      return { ok: true, data: plan.successMessage || result.data || '已完成页面操作。' };
    }

    if (structuredTask) {
      return plan.kind === 'site_tour'
        ? executeStructuredTourSteps(plan, onPhaseChange)
        : executeStructuredSiteSteps(plan, onPhaseChange);
    }

    return {
      ok: false,
      error:
        result.data ||
        (expectedUrl ? `未能稳定到达 ${expectedUrl}` : expectedPageId ? `未能稳定停留在 ${expectedPageId}` : '未能稳定完成页面操作'),
    };
  } catch (error: any) {
    if (structuredTask) {
      try {
        return plan.kind === 'site_tour'
          ? await executeStructuredTourSteps(plan, onPhaseChange)
          : await executeStructuredSiteSteps(plan, onPhaseChange);
      } catch (structuredError: any) {
        onPhaseChange?.('error', structuredError?.message || error?.message || '执行失败');
        return { ok: false, error: structuredError?.message || error?.message || '执行失败' };
      }
    }
    onPhaseChange?.('error', error?.message || '执行失败');
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
    agent.dispose();
  }
}
