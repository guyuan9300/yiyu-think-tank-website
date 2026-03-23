import { z } from 'zod';
import type { YiyuTongSiteTaskSpec } from './yiyuTongApi';
import { proxyYiyuTongPageAgent } from './yiyuTongApi';

export type YiyuTongTaskPhase = 'understanding' | 'planning' | 'locating' | 'acting' | 'done' | 'error';

export interface ExecuteYiyuTongSiteTaskOptions {
  taskSpec: YiyuTongSiteTaskSpec;
  ignoredElements?: Array<Element | null | (() => Element | null)>;
  onPhaseChange?: (phase: YiyuTongTaskPhase, detail?: string) => void;
}

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
  timeoutMs = 4500,
  intervalMs = 80
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

  const ready = await waitFor(() => getCurrentInternalUrl() === next, 5000);
  if (!ready) {
    throw new Error(`未能稳定打开 ${next}`);
  }
  await sleep(250);
  return `已在当前标签页打开 ${next}`;
}

async function waitForPage(pageId?: string) {
  if (!pageId) return true;
  const ready = await waitFor(() => getCurrentPageId() === pageId, 5000);
  if (!ready) {
    throw new Error(`未能进入 ${pageId} 页面`);
  }
  await sleep(180);
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

function areStructuredFiltersSatisfied(filters?: NonNullable<YiyuTongSiteTaskSpec['filters']>) {
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

  return true;
}

function isStructuredSiteStateSatisfied(taskSpec: YiyuTongSiteTaskSpec) {
  const expectedUrl = normalizeInternalUrl(taskSpec.expectedUrl);
  const bootstrapUrl = normalizeInternalUrl(taskSpec.bootstrapUrl);
  const expectedPageId = taskSpec.pageId || '';
  const endsOnDifferentDetail = Boolean(expectedUrl && bootstrapUrl && expectedUrl !== bootstrapUrl);
  const urlSatisfied = !expectedUrl || getCurrentInternalUrl() === expectedUrl;
  const pageSatisfied = endsOnDifferentDetail ? true : !expectedPageId || getCurrentPageId() === expectedPageId;
  const filtersSatisfied = endsOnDifferentDetail ? true : areStructuredFiltersSatisfied(taskSpec.filters);
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

async function setSiteFilters(filters: NonNullable<YiyuTongSiteTaskSpec['filters']>) {
  if (filters.searchQuery) {
    const searchInput = findSearchInput();
    if (!searchInput) {
      throw new Error('当前页面没有可用搜索框');
    }
    dispatchNativeInputValue(searchInput, filters.searchQuery);
    await sleep(300);
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

  await sleep(350);
  return '已完成当前页面筛选。';
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
  mode?: 'exact' | 'first';
}) {
  const cards = getVisibleContentCards();
  if (!cards.length) {
    throw new Error('当前页面未找到可打开的内容卡片');
  }

  let targetCard: HTMLElement | null = null;

  if (mode === 'first' || !title) {
    targetCard = cards[0] || null;
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
  const moved = await waitFor(() => getCurrentInternalUrl() !== beforeUrl, 4500);
  if (!moved) {
    throw new Error('卡片点击后页面没有发生变化');
  }

  const nextTitle = targetCard.dataset.yiyuCardTitle || '目标内容';
  return `已打开《${nextTitle}》。`;
}

function hasStructuredSiteSteps(taskSpec: YiyuTongSiteTaskSpec) {
  return Boolean(
    taskSpec.bootstrapUrl ||
      taskSpec.filters?.searchQuery ||
      taskSpec.filters?.topic ||
      taskSpec.filters?.year ||
      (taskSpec.openMode && taskSpec.openMode !== 'none')
  );
}

function isDirectOpenTask(taskSpec: YiyuTongSiteTaskSpec) {
  const hasFilters = Boolean(
    taskSpec.filters?.searchQuery ||
      taskSpec.filters?.topic ||
      taskSpec.filters?.year
  );
  return !hasFilters && (!taskSpec.openMode || taskSpec.openMode === 'none');
}

async function executeStructuredSiteSteps(
  taskSpec: YiyuTongSiteTaskSpec,
  onPhaseChange?: (phase: YiyuTongTaskPhase, detail?: string) => void
) {
  onPhaseChange?.('locating', taskSpec.phaseDetails?.locating);
  if (taskSpec.bootstrapUrl) {
    await openInternalUrl(taskSpec.bootstrapUrl);
  }
  if (taskSpec.pageId) {
    await waitForPage(taskSpec.pageId);
  }

  onPhaseChange?.('acting', taskSpec.phaseDetails?.acting);
  if (taskSpec.filters && (taskSpec.filters.searchQuery || taskSpec.filters.topic || taskSpec.filters.year)) {
    await setSiteFilters(taskSpec.filters);
  }

  if (taskSpec.openMode === 'exact' && taskSpec.openTitle) {
    await openContentCard({ title: taskSpec.openTitle, mode: 'exact' });
  } else if (taskSpec.openMode === 'first') {
    await openContentCard({ mode: 'first' });
  }

  onPhaseChange?.('done', taskSpec.successMessage || '已完成页面操作。');
  return { ok: true as const, data: taskSpec.successMessage || '已完成页面操作。' };
}

function buildPrompt(taskSpec: YiyuTongSiteTaskSpec) {
  const promptParts: string[] = [];

  if (taskSpec.bootstrapUrl) {
    promptParts.push(`先进入站内页面 "${taskSpec.bootstrapUrl}"。`);
  }
  if (taskSpec.filters?.topic || taskSpec.filters?.searchQuery || taskSpec.filters?.year) {
    promptParts.push('然后使用站内筛选工具完成搜索或筛选。');
  }
  if (taskSpec.openMode === 'exact' && taskSpec.openTitle) {
    promptParts.push(`筛选完成后，打开标题为《${taskSpec.openTitle}》的内容。`);
  } else if (taskSpec.openMode === 'first') {
    promptParts.push('筛选完成后，打开当前结果列表中的第一项。');
  }

  promptParts.push('完成后立即调用 done，只用一句中文汇报结果。');
  if (taskSpec.prompt) {
    promptParts.push(`补充要求：${taskSpec.prompt}`);
  }

  return promptParts.join(' ');
}

export async function executeYiyuTongSiteTask({
  taskSpec,
  ignoredElements = [],
  onPhaseChange,
}: ExecuteYiyuTongSiteTaskOptions) {
  onPhaseChange?.('understanding', taskSpec.phaseDetails?.understanding);
  const structuredTask = hasStructuredSiteSteps(taskSpec);

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

  const expectedUrl = normalizeInternalUrl(taskSpec.expectedUrl);
  const bootstrapUrl = normalizeInternalUrl(taskSpec.bootstrapUrl);
  const expectedPageId = taskSpec.pageId || '';

  const agent = new PageAgentCore({
    baseURL: '/api/auth/assistant/page-agent',
    model: 'doubao-seed-2-0-lite-260215',
    apiKey: 'browser-proxied',
    language: 'zh-CN',
    maxSteps: structuredTask ? 6 : 10,
    stepDelay: 0.1,
    pageController,
    customFetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
      const rawBody = typeof init?.body === 'string' ? init.body : '{}';
      return proxyYiyuTongPageAgent(JSON.parse(rawBody), init?.signal || undefined);
    },
    instructions: {
      system: [
        '你是益语通在益语官网中的同标签页页面操作执行器。',
        '你的目标是尽快完成站内页面跳转、筛选和打开详情，不要解释原理。',
        '优先使用站内专用工具，不要尝试操作益语通悬浮窗。',
        '不要打开外站，不要新建标签页。',
        '如果任务里已经给了明确站内地址、筛选条件或标题，必须优先使用 open_internal_url、set_site_filters、open_content_card。',
        '除非站内专用工具确实做不到，否则不要使用通用 click_element_by_index 去猜测页面元素。',
        '对于结构化任务，宁可尽快完成明确步骤，也不要多做无关尝试。',
        '只在任务真正完成时调用 done。',
      ].join(''),
    },
    customTools: {
      ask_user: null,
      open_internal_url: tool({
        description: '在当前标签页内打开一个明确的站内地址。',
        inputSchema: z.object({
          target: z.string().min(1),
        }),
        execute: async ({ target }: { target: string }) => {
          return openInternalUrl(target);
        },
      }),
      set_site_filters: tool({
        description: '在当前列表页中设置搜索关键词、标签或年份筛选。',
        inputSchema: z.object({
          searchQuery: z.string().optional(),
          topic: z.string().optional(),
          year: z.string().optional(),
        }),
        execute: async (payload: { searchQuery?: string; topic?: string; year?: string }) => {
          return setSiteFilters(payload);
        },
      }),
      open_content_card: tool({
        description: '打开当前列表中某个内容卡片，支持按标题精确打开或打开第一项。',
        inputSchema: z.object({
          title: z.string().optional(),
          mode: z.enum(['exact', 'first']).default('exact'),
        }),
        execute: async ({ title, mode }: { title?: string; mode?: 'exact' | 'first' }) => {
          return openContentCard({ title, mode });
        },
      }),
    },
    onBeforeTask: () => {
      onPhaseChange?.('planning', taskSpec.phaseDetails?.planning);
    },
    onBeforeStep: async (_agent: unknown, stepCount: number) => {
      if (stepCount === 0) {
        onPhaseChange?.('locating', taskSpec.phaseDetails?.locating);
        return;
      }
      onPhaseChange?.('acting', taskSpec.phaseDetails?.acting);
    },
    onAfterTask: async (_agent: unknown, result: { success: boolean; data: string }) => {
      if (result.success) {
        onPhaseChange?.('done', result.data);
      } else {
        onPhaseChange?.('error', result.data);
      }
    },
  });

  try {
    if (bootstrapUrl && getCurrentInternalUrl() !== bootstrapUrl) {
      onPhaseChange?.('locating');
      await openInternalUrl(bootstrapUrl);
    }

    if (expectedPageId) {
      await waitForPage(expectedPageId);
    }

    if (isDirectOpenTask(taskSpec) && isStructuredSiteStateSatisfied(taskSpec)) {
      onPhaseChange?.('done', taskSpec.successMessage || '已完成页面操作。');
      return { ok: true as const, data: taskSpec.successMessage || '已完成页面操作。' };
    }

    const execution = agent.execute(buildPrompt(taskSpec));
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('页面操作超时')), structuredTask ? 4500 : 12000);
    });
    const result = await Promise.race([execution, timeout]);
    const landedUrl = getCurrentInternalUrl();
    const endsOnDifferentDetail = Boolean(expectedUrl && bootstrapUrl && expectedUrl !== bootstrapUrl);
    const urlSatisfied = !expectedUrl || landedUrl === expectedUrl;
    const pageSatisfied = endsOnDifferentDetail ? true : !expectedPageId || getCurrentPageId() === expectedPageId;
    const structuredSatisfied = !structuredTask || isStructuredSiteStateSatisfied(taskSpec);

    if (result.success && urlSatisfied && pageSatisfied && structuredSatisfied) {
      return { ok: true, data: result.data || taskSpec.successMessage || '已完成页面操作。' };
    }

    if (structuredTask) {
      return executeStructuredSiteSteps(taskSpec, onPhaseChange);
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
        return await executeStructuredSiteSteps(taskSpec, onPhaseChange);
      } catch (structuredError: any) {
        onPhaseChange?.('error', structuredError?.message || error?.message || '执行失败');
        return { ok: false, error: structuredError?.message || error?.message || '执行失败' };
      }
    }
    onPhaseChange?.('error', error?.message || '执行失败');
    return { ok: false, error: error?.message || '执行失败' };
  } finally {
    try {
      await pageController.cleanUpHighlights();
    } catch {
      // ignore
    }
    agent.dispose();
  }
}
