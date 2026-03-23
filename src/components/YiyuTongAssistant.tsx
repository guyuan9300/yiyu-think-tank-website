import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  ExternalLink,
  Loader2,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { getSavedUserRaw } from '../lib/storage';
import {
  queryYiyuTong,
  type YiyuTongAction,
  type YiyuTongCitation,
  type YiyuTongCollectedFields,
  type YiyuTongConsultHandoff,
  type YiyuTongHistoryMessage,
  type YiyuTongResponse,
  type YiyuTongSiteTaskSpec,
} from '../lib/yiyuTongApi';
import { executeYiyuTongSiteTask, type YiyuTongTaskPhase } from '../lib/yiyuTongPageAgent';
import { runYiyuTongAction } from '../lib/yiyuTongActions';

type TaskStepState = {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
};

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: YiyuTongResponse['mode'];
  citations?: YiyuTongCitation[];
  collectedFields?: YiyuTongCollectedFields | null;
  handoff?: YiyuTongConsultHandoff | null;
  taskPlan?: TaskStepState[];
  taskSpec?: YiyuTongSiteTaskSpec | null;
  fallbackAction?: YiyuTongAction | null;
};

type PanelRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const STORAGE_KEY = 'yiyu_tong_frontend_state_v2';
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

function createTaskPlan(plan: string[]) {
  return plan.map((label, index): TaskStepState => ({
    label,
    status: index === 0 ? 'active' : 'pending',
  }));
}

function applyPhaseToTaskPlan(plan: TaskStepState[] | undefined, phase: YiyuTongTaskPhase) {
  if (!plan?.length) return plan || [];
  const next = plan.map(
    (step): TaskStepState => ({ ...step, status: step.status === 'error' ? 'error' : 'pending' })
  );
  const activate = (index: number) => {
    next.forEach((step, stepIndex) => {
      step.status = stepIndex < index ? 'done' : stepIndex === index ? 'active' : 'pending';
    });
  };

  if (phase === 'understanding') {
    activate(0);
  } else if (phase === 'planning') {
    activate(Math.min(1, next.length - 1));
  } else if (phase === 'locating') {
    activate(Math.min(2, next.length - 1));
  } else if (phase === 'acting') {
    activate(Math.min(3, next.length - 1));
  } else if (phase === 'done') {
    next.forEach((step) => {
      step.status = 'done';
    });
  } else if (phase === 'error') {
    const activeIndex = Math.max(
      0,
      next.findIndex((step) => step.status === 'active')
    );
    activate(activeIndex === -1 ? next.length - 1 : activeIndex);
    next[Math.min(activeIndex === -1 ? next.length - 1 : activeIndex, next.length - 1)].status = 'error';
  }

  return next;
}

function SourceCard({ card, onOpen }: { card: YiyuTongCitation; onOpen: () => void }) {
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

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
      >
        打开页面
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ConsultConfirmation({
  fields,
  action,
}: {
  fields: YiyuTongCollectedFields | null | undefined;
  action?: YiyuTongAction | null;
}) {
  const rows = [
    { label: '姓名', value: fields?.name },
    { label: '机构', value: fields?.organization },
    { label: '手机号', value: fields?.phone },
    { label: '邮箱', value: fields?.email },
    { label: '需求摘要', value: fields?.note },
  ].filter((item) => item.value);

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
      <div className="text-sm font-medium text-foreground">咨询信息确认</div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 text-[12px] leading-5">
            <div className="w-16 shrink-0 text-muted-foreground/65">{row.label}</div>
            <div className="min-w-0 flex-1 text-foreground">{row.value}</div>
          </div>
        ))}
      </div>
      {action ? (
        <button
          type="button"
          onClick={() => runYiyuTongAction(action)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          打开正式申请表
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function TaskPlanCard({ taskPlan }: { taskPlan: TaskStepState[] }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-white/80 p-3">
      <div className="text-[12px] font-medium text-muted-foreground/70">执行进度</div>
      <div className="mt-3 space-y-2">
        {taskPlan.map((step, index) => (
          <div key={`${step.label}-${index}`} className="flex items-center gap-3 text-[12px]">
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
        ))}
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
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const pendingSiteTasksRef = useRef(new Map<string, YiyuTongResponse>());
  const runningSiteTasksRef = useRef(new Set<string>());

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
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const updateMessage = (id: string, updater: (message: AssistantMessage) => AssistantMessage) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? updater(message) : message)));
  };

  const historyForBackend: YiyuTongHistoryMessage[] = useMemo(
    () =>
      messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  const runSiteTask = async (messageId: string, response: YiyuTongResponse) => {
    if (!response.taskSpec) return;
    if (runningSiteTasksRef.current.has(messageId)) return;
    runningSiteTasksRef.current.add(messageId);

    try {
      const taskSpec = response.taskSpec;
      let completed = false;
      const result = await executeYiyuTongSiteTask({
        taskSpec,
        ignoredElements: [() => panelRef.current, () => toggleButtonRef.current],
        onPhaseChange: (phase, detail) => {
          if (completed && phase !== 'done') {
            return;
          }
          if (phase === 'done') {
            completed = true;
          }
          updateMessage(messageId, (message) => ({
            ...message,
            taskPlan: applyPhaseToTaskPlan(message.taskPlan, phase),
            content:
              phase === 'done'
                ? detail || taskSpec.successMessage || message.content
                : phase === 'error'
                  ? message.fallbackAction
                    ? message.content
                    : detail || '这次操作没有稳定完成。'
                  : message.content,
          }));
        },
      });

      if (result.ok) {
        completed = true;
        updateMessage(messageId, (message) => ({
          ...message,
          taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'done'),
          content: result.data || taskSpec.successMessage || message.content,
        }));
        return;
      }

      if (response.fallbackAction) {
        completed = true;
        runYiyuTongAction(response.fallbackAction);
        updateMessage(messageId, (message) => ({
          ...message,
          taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'done'),
          content: taskSpec.successMessage || message.content,
        }));
        return;
      }

      updateMessage(messageId, (message) => ({
        ...message,
        taskPlan: applyPhaseToTaskPlan(message.taskPlan, 'error'),
        content: result.error || '这次操作没有稳定完成。',
      }));
    } finally {
      runningSiteTasksRef.current.delete(messageId);
      pendingSiteTasksRef.current.delete(messageId);
    }
  };

  useEffect(() => {
    pendingSiteTasksRef.current.forEach((response, messageId) => {
      if (runningSiteTasksRef.current.has(messageId)) return;
      const exists = messages.some((message) => message.id === messageId);
      if (!exists) return;
      void runSiteTask(messageId, response);
    });
  }, [messages]);

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
      collectedFields: response.collectedFields,
      handoff: response.handoff,
      taskPlan: response.mode === 'site_task' ? createTaskPlan(response.taskPlan) : undefined,
      taskSpec: response.taskSpec,
      fallbackAction: response.fallbackAction,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    if (response.mode === 'site_task' && response.taskSpec) {
      pendingSiteTasksRef.current.set(assistantMessageId, response);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setInput('');
    setSessionId(createSessionId());
  };

  const showConsultCard = (message: AssistantMessage) =>
    message.mode === 'consult_handoff' && Boolean(message.handoff?.ready && message.collectedFields);

  const startResize = (direction: ResizeDirection, event: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRect) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = panelRect;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let next: PanelRect = { ...startRect };

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
                你可以直接问官网里有什么内容，也可以让我帮你进入页面、筛选资料，或整理咨询信息后打开申请表。
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
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-foreground text-white'
                        : 'border border-border/50 bg-white text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.taskPlan?.length ? <TaskPlanCard taskPlan={message.taskPlan} /> : null}

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

                  {showConsultCard(message) ? (
                    <ConsultConfirmation
                      fields={message.collectedFields}
                      action={
                        message.handoff?.ready
                          ? {
                              type: 'open_consult_form',
                              label: '打开正式申请表',
                              target: message.handoff.formUrl,
                              prefillPayload: Object.fromEntries(
                                Object.entries(message.collectedFields || {}).filter(([, value]) => Boolean(value))
                              ) as Record<string, string>,
                            }
                          : null
                      }
                    />
                  ) : null}
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/50 bg-white px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  益语通正在整理信息…
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
                placeholder="比如：帮我找组织相关的书，或带我去蓝信封案例"
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
