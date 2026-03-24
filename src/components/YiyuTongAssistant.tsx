import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  PlugZap,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { getSavedUserRaw } from '../lib/storage';
import {
  queryYiyuTong,
  type YiyuTongCitation,
  type YiyuTongExecutionPlan,
  type YiyuTongFallbackPlan,
  type YiyuTongFormContext,
  type YiyuTongHistoryMessage,
  type YiyuTongResponse,
  type YiyuTongTaskStep,
} from '../lib/yiyuTongApi';
import { executeYiyuTongSiteTask, type YiyuTongTaskPhase } from '../lib/yiyuTongPageAgent';
import { runYiyuTongAction } from '../lib/yiyuTongActions';
import {
  executeYiyuTongExtensionTask,
  getPageAgentExtInstallUrl,
  getPageAgentExtStatus,
  promptAndSavePageAgentExtToken,
  type YiyuTongExtensionStatus,
} from '../lib/yiyuTongPageAgentExt';

type TaskStepState = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
};

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: YiyuTongResponse['mode'];
  citations?: YiyuTongCitation[];
  taskPlan?: TaskStepState[];
  executionPlan?: YiyuTongExecutionPlan;
  fallbackPlan?: YiyuTongFallbackPlan | null;
  formContext?: YiyuTongFormContext | null;
  needsExtensionSetup?: boolean;
  extensionError?: string | null;
};

type PanelRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const STORAGE_KEY = 'yiyu_tong_frontend_state_v3';
const MIN_WIDTH = 340;
const MIN_HEIGHT = 420;

function createSessionId() {
  return `yt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createMessageId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function loadKnownUserInfo() {
  const raw = getSavedUserRaw();
  if (!raw) return {};
  try {
    const user = JSON.parse(raw);
    return {
      nickname: user?.nickname || '',
      phone: user?.phone || '',
      email: user?.email || '',
      organization: user?.organization || user?.strategyProjectName || '',
    };
  } catch {
    return {};
  }
}

function getInitialPanelRect(): PanelRect {
  const width = Math.min(420, window.innerWidth - 32);
  const height = Math.min(640, window.innerHeight - 120);
  return {
    width,
    height,
    left: Math.max(16, window.innerWidth - width - 24),
    top: Math.max(16, window.innerHeight - height - 96),
  };
}

function clampPanelRect(rect: PanelRect): PanelRect {
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - 32);
  const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - 32);
  const width = Math.min(Math.max(rect.width, MIN_WIDTH), maxWidth);
  const height = Math.min(Math.max(rect.height, MIN_HEIGHT), maxHeight);
  const left = Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - width - 16));
  const top = Math.min(Math.max(rect.top, 16), Math.max(16, window.innerHeight - height - 16));
  return { width, height, left, top };
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        sessionId: createSessionId(),
        open: false,
        messages: [] as AssistantMessage[],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      sessionId: parsed?.sessionId || createSessionId(),
      open: Boolean(parsed?.open),
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
    };
  } catch {
    return {
      sessionId: createSessionId(),
      open: false,
      messages: [] as AssistantMessage[],
    };
  }
}

function createTaskPlan(steps: YiyuTongTaskStep[]) {
  return steps.map((step, index): TaskStepState => ({
    id: step.id,
    label: step.label,
    detail: step.detail,
    status: (index === 0 ? 'active' : 'pending') as TaskStepState['status'],
  }));
}

function applyPhaseToTaskPlan(
  plan: TaskStepState[] | undefined,
  phase: YiyuTongTaskPhase,
  detail?: string
) {
  if (!plan?.length) return plan || [];
  const next = plan.map((step): TaskStepState => ({ ...step, status: 'pending' }));
  const setStatusById = (id: string) => {
    const activeIndex = next.findIndex((step) => step.id === id);
    const safeIndex = activeIndex === -1 ? next.length - 1 : activeIndex;
    next.forEach((step, index) => {
      step.status = index < safeIndex ? 'done' : index === safeIndex ? 'active' : 'pending';
    });
    return safeIndex;
  };

  let detailIndex = -1;
  if (phase === 'understanding') detailIndex = setStatusById('understanding');
  else if (phase === 'planning') detailIndex = setStatusById('planning');
  else if (phase === 'locating') detailIndex = setStatusById('locating');
  else if (phase === 'acting') detailIndex = setStatusById('acting');
  else if (phase === 'done') {
    next.forEach((step) => {
      step.status = 'done';
      if (typeof step.detail === 'string' && /^(InvokeError:|Task failed|页面操作超时|执行失败)/.test(step.detail.trim())) {
        step.detail = '';
      }
    });
    detailIndex = next.length - 1;
  } else if (phase === 'error') {
    detailIndex = Math.max(0, next.findIndex((step) => step.status === 'active'));
    if (detailIndex === -1) detailIndex = next.length - 1;
    next.forEach((step, index) => {
      step.status = index < detailIndex ? 'done' : index === detailIndex ? 'error' : 'pending';
    });
  }

  if (detail && detailIndex >= 0 && next[detailIndex]) {
    next[detailIndex].detail = detail;
  }

  return next;
}

function SourceCard({ card, onOpen }: { card: YiyuTongCitation; onOpen: () => void }) {
  const currentInternalUrl = typeof window === 'undefined'
    ? ''
    : `${window.location.pathname}${window.location.search}`;
  const cardInternalUrl = (() => {
    if (!card.url) return '';
    if (/^https?:\/\//.test(card.url)) {
      const parsed = new URL(card.url, window.location.origin);
      return `${parsed.pathname}${parsed.search}`;
    }
    if (card.url.startsWith('?')) {
      return `${window.location.pathname}${card.url}`;
    }
    return card.url;
  })();
  const isCurrentPage = Boolean(cardInternalUrl && currentInternalUrl === cardInternalUrl);

  return (
    <div className="rounded-2xl border border-border/50 bg-white/85 p-3">
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted/50">
          {card.coverUrl ? (
            <img src={card.coverUrl} alt={card.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-muted-foreground/70">
              {card.label || '内容'}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground/65">{card.label || '内容'}</div>
          <div className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-foreground">{card.title}</div>
          <div className="mt-2 line-clamp-3 text-[12px] leading-5 text-muted-foreground/75">{card.snippet}</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(card.tags || []).slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground/60">{card.publishDate || ''}</span>
          </div>
        </div>
      </div>

      {isCurrentPage ? (
        <div className="mt-3 text-xs font-medium text-muted-foreground/60">当前页面</div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
        >
          打开页面
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TaskPlanCard({ taskPlan }: { taskPlan: TaskStepState[] }) {
  const [expanded, setExpanded] = useState(() => taskPlan.some((step) => Boolean(step.detail)));
  const summaryDetail =
    [...taskPlan].reverse().find((step) => (step.status === 'active' || step.status === 'error') && step.detail)?.detail
    || [...taskPlan].reverse().find((step) => step.detail)?.detail;

  return (
    <div className="rounded-2xl border border-border/50 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium text-muted-foreground/70">执行进度</div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground/75 hover:bg-muted/60 hover:text-foreground"
        >
          {expanded ? '收起详情' : '展开详情'}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {!expanded && summaryDetail ? (
        <div className="mt-2 rounded-xl bg-muted/35 px-3 py-2 text-[11px] leading-5 text-muted-foreground/80">
          {summaryDetail}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {taskPlan.map((step, index) => (
          <div key={`${step.id}-${index}`} className="space-y-1.5">
            <div className="flex items-center gap-3 text-[12px]">
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                  step.status === 'done'
                    ? 'bg-primary text-primary-foreground'
                    : step.status === 'active'
                      ? 'border border-primary/30 bg-primary/10 text-primary'
                      : step.status === 'error'
                        ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border border-border/50 bg-muted/20 text-muted-foreground'
                }`}
              >
                {step.status === 'done' ? '✓' : index + 1}
              </span>
              <span
                className={
                  step.status === 'active'
                    ? 'font-medium text-foreground'
                    : step.status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground/75'
                }
              >
                {step.label}
              </span>
            </div>
            {expanded && step.detail ? (
              <div className="ml-8 rounded-xl bg-muted/35 px-3 py-2 text-[11px] leading-5 text-muted-foreground/80">
                {step.detail}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExtensionGuideCard({
  status,
  onInstall,
  onConnect,
  onRetry,
  error,
}: {
  status: YiyuTongExtensionStatus;
  onInstall: () => void;
  onConnect: () => void;
  onRetry: () => void;
  error?: string | null;
}) {
  const needsInstall = !status.available;
  const needsToken = status.available && !status.tokenSet;
  const title = needsInstall
    ? '要继续自动填写表单，需要先安装 Page Agent 扩展。'
    : needsToken
      ? '要继续自动填写表单，需要先连接 Page Agent 扩展。'
      : '扩展已连接，可以继续自动填写。';

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <PlugZap className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="mt-1 text-[12px] leading-5 text-muted-foreground/75">
            {needsInstall
              ? '安装后回到当前页面，输入扩展授权令牌，益语通就会继续把你提供的信息直接填到飞书表单里。'
              : needsToken
                ? '扩展安装后，请输入扩展里的授权令牌。连接成功后，当前任务会继续执行，不需要重新描述。'
                : '如果刚刚还没自动填成功，可以重新执行当前任务。'}
          </div>
          {error ? (
            <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-[12px] leading-5 text-destructive">
              {error}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {needsInstall ? (
              <button
                type="button"
                onClick={onInstall}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                安装扩展
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {needsToken || !status.ready ? (
              <button
                type="button"
                onClick={onConnect}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted/40"
              >
                输入授权令牌
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted/40"
            >
              重新检测并继续
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function YiyuTongAssistant({ currentPage }: { currentPage: string }) {
  const initialState = useMemo(() => loadInitialState(), []);
  const [isOpen, setIsOpen] = useState(initialState.open);
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialState.messages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const [activeFormContext, setActiveFormContext] = useState<YiyuTongFormContext | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<YiyuTongExtensionStatus>(() => getPageAgentExtStatus());
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const pendingExtensionTasksRef = useRef(new Map<string, YiyuTongResponse>());
  const runningTasksRef = useRef(new Set<string>());

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sessionId, open: isOpen, messages: messages.slice(-20) })
      );
    } catch {
      // ignore
    }
  }, [isOpen, messages, sessionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    setPanelRect((current) => clampPanelRect(current || getInitialPanelRect()));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setPanelRect((current) => (current ? clampPanelRect(current) : getInitialPanelRect()));
      setExtensionStatus(getPageAgentExtStatus());
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('focus', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', handleResize);
    };
  }, [isOpen]);

  const updateMessage = (id: string, updater: (message: AssistantMessage) => AssistantMessage) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? updater(message) : message)));
  };

  const historyForBackend: YiyuTongHistoryMessage[] = useMemo(
    () =>
      messages.slice(-12).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  const runExecutionPlan = async (messageId: string, response: YiyuTongResponse) => {
    if (runningTasksRef.current.has(messageId)) return;
    runningTasksRef.current.add(messageId);

    try {
      const plan = response.executionPlan;
      if (!plan || plan.executor === 'none') {
        return;
      }

      if (plan.executor === 'same_tab_page_agent') {
        let completed = false;
        const result = await executeYiyuTongSiteTask({
          plan,
          ignoredElements: [() => panelRef.current, () => toggleButtonRef.current],
          onPhaseChange: (phase, detail) => {
            if (completed && phase !== 'done') return;
            if (phase === 'done') completed = true;
            updateMessage(messageId, (message) => ({
              ...message,
              taskPlan: applyPhaseToTaskPlan(message.taskPlan, phase, detail),
              content:
                phase === 'done'
                  ? detail || response.message
                  : phase === 'error'
                    ? detail || '这次页面操作没有稳定完成。'
                    : message.content,
            }));
          },
        });

        if (result.ok) {
          updateMessage(messageId, (message) => ({
            ...message,
            taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'done', result.data || response.message),
            content: result.data || response.message,
          }));
          return;
        }

        if (response.fallbackPlan?.action) {
          runYiyuTongAction(response.fallbackPlan.action);
          updateMessage(messageId, (message) => ({
            ...message,
            taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'done', response.fallbackPlan?.message || response.message),
            content: response.fallbackPlan?.message || response.message,
          }));
          return;
        }

        updateMessage(messageId, (message) => ({
          ...message,
          taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'error', result.error || '这次页面操作没有稳定完成。'),
          content: result.error || '这次页面操作没有稳定完成。',
        }));
        return;
      }

      const latestExtensionStatus = getPageAgentExtStatus();
      setExtensionStatus(latestExtensionStatus);
      if (!latestExtensionStatus.ready) {
        pendingExtensionTasksRef.current.set(messageId, response);
        updateMessage(messageId, (message) => ({
          ...message,
          needsExtensionSetup: true,
          extensionError: latestExtensionStatus.available
            ? '尚未完成扩展授权，当前无法继续自动填写。'
            : '当前浏览器里还没有可用的 Page Agent 扩展。',
        }));
        return;
      }

      const result = await executeYiyuTongExtensionTask({
        plan,
        onPhaseChange: (phase, detail) => {
      const mappedPhase: YiyuTongTaskPhase =
        phase === 'checking' || phase === 'opening'
          ? 'locating'
          : phase === 'filling' || phase === 'waiting'
            ? 'acting'
            : phase;
      updateMessage(messageId, (message) => ({
        ...message,
        taskPlan: applyPhaseToTaskPlan(message.taskPlan, mappedPhase, detail),
        needsExtensionSetup: false,
        extensionError: null,
        content:
          mappedPhase === 'done'
            ? detail || response.message
            : mappedPhase === 'error'
              ? detail || '这次跨标签页自动填写没有稳定完成。'
              : message.content,
      }));
    },
  });

      if (result.ok) {
        updateMessage(messageId, (message) => ({
          ...message,
          taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'done', result.data || response.message),
          content: result.data || response.message,
          needsExtensionSetup: false,
          extensionError: null,
        }));
        pendingExtensionTasksRef.current.delete(messageId);
        return;
      }

      updateMessage(messageId, (message) => ({
        ...message,
        taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'error', result.error || '这次跨标签页自动填写没有稳定完成。'),
        content: result.error || '这次跨标签页自动填写没有稳定完成。',
        needsExtensionSetup: false,
        extensionError: result.error || '跨标签页执行失败',
      }));
    } finally {
      runningTasksRef.current.delete(messageId);
    }
  };

  const enqueueExecution = (messageId: string, response: YiyuTongResponse) => {
    window.setTimeout(() => {
      void runExecutionPlan(messageId, response);
    }, 0);
  };

  const submitQuestion = async (question: string) => {
    const text = question.trim();
    if (!text || isLoading) return;

    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const result = await queryYiyuTong({
      question: text,
      sessionId,
      currentPage,
      currentUrl: window.location.pathname + window.location.search,
      knownUserInfo: loadKnownUserInfo(),
      history: historyForBackend,
      activeFormContext,
    });

    setIsLoading(false);

    if (!result.ok || !result.data) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.error || '益语通暂时没接上，请稍后再试。',
          citations: [],
        },
      ]);
      return;
    }

    const response = result.data;
    const assistantMessageId = createMessageId();
    const assistantMessage: AssistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: response.message,
      mode: response.mode,
      citations: response.citations,
      taskPlan: response.steps.length ? createTaskPlan(response.steps) : undefined,
      executionPlan: response.executionPlan,
      fallbackPlan: response.fallbackPlan,
      formContext: response.formContext,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setActiveFormContext(response.formContext?.active ? response.formContext : null);

    if (response.executionPlan.executor !== 'none') {
      enqueueExecution(assistantMessageId, response);
    }
  };

  const clearConversation = () => {
    pendingExtensionTasksRef.current.clear();
    runningTasksRef.current.clear();
    setMessages([]);
    setInput('');
    setSessionId(createSessionId());
    setActiveFormContext(null);
  };

  const retryExtensionTask = async (messageId: string) => {
    const response = pendingExtensionTasksRef.current.get(messageId);
    if (!response) {
      setExtensionStatus(getPageAgentExtStatus());
      return;
    }
    const status = getPageAgentExtStatus();
    setExtensionStatus(status);
    if (!status.ready) {
      updateMessage(messageId, (message) => ({
        ...message,
        needsExtensionSetup: true,
        extensionError: status.available ? '扩展仍未完成授权。' : '当前浏览器仍未检测到可用扩展。',
      }));
      return;
    }
    updateMessage(messageId, (message) => ({
      ...message,
      needsExtensionSetup: false,
      extensionError: null,
    }));
    pendingExtensionTasksRef.current.delete(messageId);
    await runExecutionPlan(messageId, response);
  };

  const connectExtension = async (messageId: string) => {
    promptAndSavePageAgentExtToken();
    const status = getPageAgentExtStatus();
    setExtensionStatus(status);
    if (status.ready) {
      await retryExtensionTask(messageId);
    }
  };

  const startResize = (direction: ResizeDirection, event: ReactMouseEvent<HTMLDivElement>) => {
    if (!panelRect) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = panelRect;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const next: PanelRect = { ...startRect };

      if (direction.includes('e')) {
        next.width = startRect.width + deltaX;
      }
      if (direction.includes('s')) {
        next.height = startRect.height + deltaY;
      }
      if (direction.includes('w')) {
        next.width = startRect.width - deltaX;
        next.left = startRect.left + deltaX;
      }
      if (direction.includes('n')) {
        next.height = startRect.height - deltaY;
        next.top = startRect.top + deltaY;
      }

      if (next.width < MIN_WIDTH) {
        if (direction.includes('w')) {
          next.left -= MIN_WIDTH - next.width;
        }
        next.width = MIN_WIDTH;
      }
      if (next.height < MIN_HEIGHT) {
        if (direction.includes('n')) {
          next.top -= MIN_HEIGHT - next.height;
        }
        next.height = MIN_HEIGHT;
      }

      setPanelRect(clampPanelRect(next));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const currentRect = panelRect || (typeof window !== 'undefined' ? getInitialPanelRect() : null);

  return (
    <>
      <button
        ref={toggleButtonRef}
        type="button"
        data-page-agent-ignore="true"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)] hover:bg-foreground/90"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        益语通
      </button>

      {isOpen && currentRect ? (
        <div
          ref={panelRef}
          data-page-agent-ignore="true"
          className="fixed z-[69] flex flex-col overflow-hidden rounded-[28px] border border-border/60 bg-white/95 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          style={{
            left: `${currentRect.left}px`,
            top: `${currentRect.top}px`,
            width: `${currentRect.width}px`,
            height: `${currentRect.height}px`,
          }}
        >
          <div className="border-b border-border/50 bg-white/90 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[270px] text-[12px] leading-5 text-muted-foreground/75">
                你可以直接让我找内容、带你逛网站，或让我在官网里自动完成查找、筛选、打开和填写表单。
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="清空对话记录"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="关闭益语通"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] space-y-3 ${message.role === 'user' ? 'items-end' : ''}`}>
                  <div
                    data-yiyu-assistant-message={message.role}
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-foreground text-white'
                        : 'border border-border/50 bg-white text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.taskPlan?.length ? <TaskPlanCard taskPlan={message.taskPlan} /> : null}

                  {message.needsExtensionSetup && message.formContext?.active ? (
                    <ExtensionGuideCard
                      status={extensionStatus}
                      error={message.extensionError}
                      onInstall={() => {
                        window.open(getPageAgentExtInstallUrl(), '_blank', 'noopener,noreferrer');
                      }}
                      onConnect={() => {
                        void connectExtension(message.id);
                      }}
                      onRetry={() => {
                        void retryExtensionTask(message.id);
                      }}
                    />
                  ) : null}

                  {message.citations?.length ? (
                    <div className="space-y-2">
                      {message.citations.map((card) => (
                        <SourceCard
                          key={`${message.id}-${card.contentType}-${card.contentId}`}
                          card={card}
                          onOpen={() =>
                            runYiyuTongAction({
                              type: 'open_detail',
                              label: '打开对应页面',
                              target: card.url,
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/50 bg-white px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  益语通正在规划并执行任务…
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/50 bg-white/90 p-4">
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitQuestion(input);
                  }
                }}
                placeholder="比如：帮我找组织相关的书，或带我逛一下这个网站"
                className="min-h-[88px] w-full resize-none border-0 bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1">
                <div />
                <button
                  type="button"
                  onClick={() => void submitQuestion(input)}
                  disabled={!input.trim() || isLoading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  发送
                </button>
              </div>
            </div>
          </div>

          {[
            { direction: 'n', className: 'left-4 right-4 top-[-4px] h-2 cursor-ns-resize' },
            { direction: 's', className: 'left-4 right-4 bottom-[-4px] h-2 cursor-ns-resize' },
            { direction: 'e', className: 'top-4 bottom-4 right-[-4px] w-2 cursor-ew-resize' },
            { direction: 'w', className: 'top-4 bottom-4 left-[-4px] w-2 cursor-ew-resize' },
            { direction: 'ne', className: 'top-[-4px] right-[-4px] h-4 w-4 cursor-nesw-resize' },
            { direction: 'nw', className: 'top-[-4px] left-[-4px] h-4 w-4 cursor-nwse-resize' },
            { direction: 'se', className: 'bottom-[-4px] right-[-4px] h-4 w-4 cursor-nwse-resize' },
            { direction: 'sw', className: 'bottom-[-4px] left-[-4px] h-4 w-4 cursor-nesw-resize' },
          ].map((handle) => (
            <div
              key={handle.direction}
              data-yiyu-resize-handle={handle.direction}
              onMouseDown={(event) => startResize(handle.direction as ResizeDirection, event)}
              className={`absolute z-[71] bg-transparent ${handle.className}`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
