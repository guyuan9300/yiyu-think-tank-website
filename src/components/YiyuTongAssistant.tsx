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
  type YiyuTongCollectedFields,
  type YiyuTongResponse,
  type YiyuTongSourceCard,
} from '../lib/yiyuTongApi';
import { runYiyuTongAction } from '../lib/yiyuTongActions';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: YiyuTongResponse['mode'];
  sourceCards?: YiyuTongSourceCard[];
  actions?: YiyuTongAction[];
  collectedFields?: YiyuTongCollectedFields | null;
  followups?: string[];
};

const STORAGE_KEY = 'yiyu_tong_frontend_state_v1';

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

function SourceCard({ card, onOpen }: { card: YiyuTongSourceCard; onOpen: () => void }) {
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
  action?: YiyuTongAction;
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
      <div className="text-sm font-medium text-foreground">咨询信息确认卡</div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 text-[12px] leading-5">
            <div className="w-16 shrink-0 text-muted-foreground/65">{row.label}</div>
            <div className="min-w-0 flex-1 text-foreground">{row.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground/70">
        若飞书表单暂时无法稳定自动预填，这些信息会作为确认卡保留，你打开正式表单后只需少量补填。
      </p>
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

export function YiyuTongAssistant({ currentPage }: { currentPage: string }) {
  const initialState = useMemo(() => loadInitialState(), []);
  const [isOpen, setIsOpen] = useState(initialState.open);
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialState.messages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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
    });

    setIsLoading(false);

    if (!result.ok || !result.data) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.error || '益语通暂时没接上，请稍后再试。',
          sourceCards: [],
          actions: [],
        },
      ]);
      return;
    }

    const response = result.data;
    const assistantMessage: AssistantMessage = {
      id: createMessageId(),
      role: 'assistant',
      content: response.answer,
      mode: response.mode,
      sourceCards: response.sourceCards,
      actions: response.actions,
      collectedFields: response.collectedFields,
      followups: response.followups,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    if (response.mode === 'navigate' && response.actions?.[0]) {
      window.setTimeout(() => {
        runYiyuTongAction(response.actions[0]);
      }, 180);
    }
  };

  const showConsultCard = (message: AssistantMessage) =>
    message.mode === 'consult_intake' && (message.collectedFields || message.actions?.[0]);

  const clearConversation = () => {
    setMessages([]);
    setInput('');
    setSessionId(createSessionId());
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)] hover:bg-foreground/90"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        益语通
      </button>

      {isOpen ? (
        <div
          className="fixed bottom-24 right-6 z-[69] flex h-[min(78vh,720px)] w-[min(92vw,420px)] resize flex-col overflow-hidden rounded-[28px] border border-border/60 bg-white/95 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          style={{ minWidth: '340px', minHeight: '420px', maxWidth: '92vw', maxHeight: '78vh' }}
        >
          <div className="border-b border-border/50 bg-white/90 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[270px] text-[12px] leading-5 text-muted-foreground/75">
                可以直接问官网里有什么内容，也可以让我带你去某个页面，或先整理咨询信息再打开正式申请表。
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

                  {message.sourceCards?.length ? (
                    <div className="space-y-2">
                      {message.sourceCards.map((card) => (
                        <SourceCard key={`${message.id}-${card.contentType}-${card.contentId}`} card={card} onOpen={() => runYiyuTongAction({
                          type: 'open_detail',
                          label: '打开对应页面',
                          target: card.url,
                        })} />
                      ))}
                    </div>
                  ) : null}

                  {showConsultCard(message) ? (
                    <ConsultConfirmation fields={message.collectedFields} action={message.actions?.[0]} />
                  ) : null}

                  {!showConsultCard(message) && message.actions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        <button
                          key={`${message.id}-${action.label}-${action.target}`}
                          type="button"
                          onClick={() => runYiyuTongAction(action)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-2 text-xs font-medium text-foreground hover:border-primary/30 hover:text-primary"
                        >
                          {action.label}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {message.followups?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {message.followups.map((item) => (
                        <button
                          key={`${message.id}-${item}`}
                          type="button"
                          onClick={() => void submitQuestion(item)}
                          className="rounded-full bg-primary/6 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
                        >
                          {item}
                        </button>
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
                placeholder="直接问我官网里有什么，或说“带我去图书馆”"
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
        </div>
      ) : null}
    </>
  );
}
