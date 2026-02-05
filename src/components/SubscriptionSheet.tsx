import { useEffect, useMemo, useState } from 'react';
import { X, Mail, CheckCircle2 } from 'lucide-react';
import { isPremiumMember, getCurrentUser } from '../lib/auth';

export type SubscriptionFrequency = 'weekly';

export interface SubscriptionPrefs {
  enabled: boolean;
  email: string;
  frequency: SubscriptionFrequency;
  // content types
  topics: {
    insights: boolean;
    reports: boolean;
    tools: boolean;
    strategyUpdates: boolean;
  };
  // style
  formats: {
    digest: boolean;
    keyTakeaways: boolean;
    actionChecklist: boolean;
  };
  updatedAt: string;
}

const STORAGE_KEY = 'yiyu_subscription_prefs';

export function loadSubscriptionPrefs(): SubscriptionPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SubscriptionPrefs) : null;
  } catch {
    return null;
  }
}

export function saveSubscriptionPrefs(prefs: SubscriptionPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event('yiyu_data_change'));
}

function defaultPrefs(): SubscriptionPrefs {
  const user = getCurrentUser();
  return {
    enabled: true,
    email: user?.email || '',
    frequency: 'weekly',
    topics: {
      insights: true,
      reports: true,
      tools: false,
      strategyUpdates: true,
    },
    formats: {
      digest: true,
      keyTakeaways: true,
      actionChecklist: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function canUseSubscription(): boolean {
  // Paid members + strategy companion clients.
  // For now: premium membership OR admin flag OR explicit strategy flag.
  // (We'll refine once the user model is clarified.)
  const isAdmin = localStorage.getItem('yiyu_is_admin') === 'true';
  const isStrategy = localStorage.getItem('yiyu_is_strategy_client') === 'true';
  return isPremiumMember() || isAdmin || isStrategy;
}

export function SubscriptionSheet({
  open,
  onClose,
  onGoUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  onGoUpgrade?: () => void;
}) {
  const eligible = useMemo(() => canUseSubscription(), []);

  const [prefs, setPrefs] = useState<SubscriptionPrefs>(() => loadSubscriptionPrefs() || defaultPrefs());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setPrefs(loadSubscriptionPrefs() || defaultPrefs());
  }, [open]);

  if (!open) return null;

  const toggle = (path: string) => {
    setPrefs((p) => {
      const next = structuredClone(p);
      const [group, key] = path.split('.') as [keyof SubscriptionPrefs, any];
      // @ts-expect-error
      next[group][key] = !next[group][key];
      next.updatedAt = new Date().toISOString();
      return next;
    });
  };

  const handleSave = () => {
    if (!eligible) return;
    const next = { ...prefs, updatedAt: new Date().toISOString() };
    saveSubscriptionPrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-[10vh] w-[92vw] max-w-[680px] -translate-x-1/2 rounded-[28px] bg-white/90 backdrop-blur-xl border border-border/40 shadow-2xl shadow-black/10 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border/40 flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[12px] font-medium border border-primary/20">
              <Mail className="w-4 h-4" />
              <span>每周订阅</span>
            </div>
            <h3 className="mt-3 text-[24px] font-semibold tracking-tight">订阅前沿更新</h3>
            <p className="mt-1 text-[14px] text-muted-foreground/70">
              每周把最新洞察与报告发送到你的邮箱。你可以选择关注的类型与呈现形式。
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted/30 transition-colors" aria-label="关闭">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {!eligible && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-[14px] text-amber-800 font-medium">订阅为会员/战略陪伴客户权益</p>
              <p className="text-[13px] text-amber-800/80 mt-1">开通会员后可选择类型与形式，并开启每周邮件更新。</p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={onGoUpgrade}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-[14px] font-medium hover:bg-gray-800"
                >
                  开通会员
                </button>
                <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-amber-200 text-[14px]">
                  先浏览公开内容
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">订阅类型（多选）</p>
              <div className="space-y-2">
                {(
                  [
                    { k: 'topics.insights', label: '洞察文章' },
                    { k: 'topics.reports', label: '前沿报告' },
                    { k: 'topics.tools', label: '工具/模板' },
                    { k: 'topics.strategyUpdates', label: '战略陪伴更新' },
                  ] as const
                ).map((it) => (
                  <label key={it.k} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <span className="text-[14px] font-medium">{it.label}</span>
                    <input
                      type="checkbox"
                      checked={it.k.startsWith('topics.') ? (prefs.topics as any)[it.k.split('.')[1]] : false}
                      onChange={() => toggle(it.k)}
                      disabled={!eligible}
                      className="w-5 h-5"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">订阅形式（多选）</p>
              <div className="space-y-2">
                {(
                  [
                    { k: 'formats.digest', label: '本周摘要（默认）' },
                    { k: 'formats.keyTakeaways', label: '重点解读（更短）' },
                    { k: 'formats.actionChecklist', label: '行动清单（可执行）' },
                  ] as const
                ).map((it) => (
                  <label key={it.k} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <span className="text-[14px] font-medium">{it.label}</span>
                    <input
                      type="checkbox"
                      checked={it.k.startsWith('formats.') ? (prefs.formats as any)[it.k.split('.')[1]] : false}
                      onChange={() => toggle(it.k)}
                      disabled={!eligible}
                      className="w-5 h-5"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">发送邮箱</p>
            <input
              value={prefs.email}
              onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.value, updatedAt: new Date().toISOString() }))}
              placeholder="name@example.com"
              disabled={!eligible}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-[12px] text-muted-foreground/60">频率：每周一次（后续可选周一上午/周五下午）</p>
            <button
              onClick={handleSave}
              disabled={!eligible || !prefs.email.trim()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  已保存
                </>
              ) : (
                '保存订阅'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
