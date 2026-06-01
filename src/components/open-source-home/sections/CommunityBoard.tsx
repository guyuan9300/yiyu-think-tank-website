import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, MessageSquare, Puzzle, ThumbsUp, Sparkles, Wrench } from 'lucide-react';
import { getSavedAuthToken } from '../../../lib/storage';
import { useLang, type Bilingual } from '../../../lib/i18n';

// ============================================================
// 共建参与人次 · 社区面板
// 点击 Ledger 第 3 张"共建参与人次"卡片打开。
// 左右结构: 需求 (新能力) + 模块建议 (现有打磨)
// 底部居中 + 按钮, 登录后可点; 弹窗内 radio 选择两类之一
// ⚠️ 占位条目, 上线前需替换为真数据 (守 ANTI_FAKE 红线)
// ============================================================

const ACCENT = '#7C3AED';
const ACCENT_SOFT = '#EDE4FE';

type EntryStatus = 'evaluating' | 'in-progress' | 'merged' | 'shipped' | 'adopted' | 'discussing';
type Category = 'request' | 'suggestion';

interface Entry {
  title: Bilingual;
  description: Bilingual;
  author: string;
  city: Bilingual;
  date: Bilingual;
  status: EntryStatus;
  votes?: number;
  module?: Bilingual;
}

const STATUS_LABEL: Record<EntryStatus, Bilingual> = {
  evaluating: { zh: '评估中', en: 'Evaluating' },
  'in-progress': { zh: '进行中', en: 'In Progress' },
  merged: { zh: '已合并', en: 'Merged' },
  shipped: { zh: '已发版', en: 'Shipped' },
  adopted: { zh: '已采纳', en: 'Adopted' },
  discussing: { zh: '讨论中', en: 'Discussing' },
};

const STATUS_TONE: Record<EntryStatus, { bg: string; fg: string }> = {
  evaluating: { bg: '#F1F3F8', fg: '#5A6178' },
  'in-progress': { bg: '#FEF3C7', fg: '#92400E' },
  merged: { bg: ACCENT_SOFT, fg: ACCENT },
  shipped: { bg: '#D1FAE5', fg: '#065F46' },
  adopted: { bg: ACCENT_SOFT, fg: ACCENT },
  discussing: { bg: '#F1F3F8', fg: '#5A6178' },
};

// ---- 需求: 平台目前没有的能力, 用户希望新增 (0 → 1) ----
const REQUESTS: Entry[] = [
  {
    title: { zh: '事件线一键导出 PDF 周报', en: 'One-click PDF weekly report from the timeline' },
    description: {
      zh: '点一次按钮，自动生成本周一句话总结 + 关键判断 + 下一步建议的 PDF，发给客户省一小时。',
      en: 'One click generates a PDF with the week’s one-line summary, key judgments, and next steps — saves an hour per client.',
    },
    author: '云**',
    city: { zh: '北京', en: 'Beijing' },
    date: { zh: '5 天前', en: '5 days ago' },
    status: 'shipped',
    votes: 41,
  },
  {
    title: { zh: 'AI 主动提醒"本周该跟进的客户"', en: 'Yiyu AI flags which clients to follow up this week' },
    description: {
      zh: '每周一早上推一条消息，告诉我这周哪些客户该联系了——基于上次互动间隔 + 事件线状态自动推断。',
      en: 'A Monday-morning nudge listing who to reach out to this week, inferred from last contact and timeline status.',
    },
    author: 'Yang*',
    city: { zh: '上海', en: 'Shanghai' },
    date: { zh: '8 天前', en: '8 days ago' },
    status: 'in-progress',
    votes: 38,
  },
  {
    title: { zh: '平台对接微信公众号文章当知识源', en: 'Pull WeChat articles in as knowledge sources' },
    description: {
      zh: '希望可以输入公众号 url，自动抓正文进知识库，可被语料库 / AI 判断引用。',
      en: 'Paste a WeChat article URL and have the body auto-ingested into the knowledge base, citable by the corpus and AI.',
    },
    author: '刘*',
    city: { zh: '杭州', en: 'Hangzhou' },
    date: { zh: '11 天前', en: '11 days ago' },
    status: 'evaluating',
    votes: 27,
  },
  {
    title: { zh: '新增"交付物归档"独立模块', en: 'A dedicated deliverables archive module' },
    description: {
      zh: '每个客户能沉淀一个交付物时间线，方案 / 报告 / 录屏统一归档，下次签新合同前一键检索。',
      en: 'A per-client deliverable timeline that files proposals, reports, and recordings together for one-click retrieval before the next contract.',
    },
    author: 'Wang*',
    city: { zh: '成都', en: 'Chengdu' },
    date: { zh: '14 天前', en: '14 days ago' },
    status: 'discussing',
    votes: 22,
  },
  {
    title: { zh: '任务月历支持订阅到 Apple 日历', en: 'Subscribe the task calendar to Apple Calendar' },
    description: {
      zh: '生成一条 iCal 订阅链接，加到 Mac 系统日历后任务自动同步过去，跟会议混排。',
      en: 'Generate an iCal subscription link so tasks sync into the Mac system calendar alongside meetings.',
    },
    author: '张*',
    city: { zh: '广州', en: 'Guangzhou' },
    date: { zh: '17 天前', en: '17 days ago' },
    status: 'evaluating',
    votes: 19,
  },
  {
    title: { zh: '客户工作台增加"判断版本对比"视图', en: 'A judgment-version comparison view in the workspace' },
    description: {
      zh: '把两次不同时间产出的判断版本并排出来 + 标差异，看清楚结论是怎么演化的。',
      en: 'Show two judgment versions side by side with diffs highlighted, so you can see how conclusions evolved.',
    },
    author: 'Liu*',
    city: { zh: '深圳', en: 'Shenzhen' },
    date: { zh: '21 天前', en: '21 days ago' },
    status: 'discussing',
    votes: 15,
  },
];

// ---- 模块建议: 现有功能里希望调整 / 打磨的细节 (1 → 1.1) ----
const SUGGESTIONS: Entry[] = [
  {
    module: { zh: '任务月历', en: 'Task Calendar' },
    title: { zh: '月历视图按客户颜色聚合', en: 'Color the calendar grid by client' },
    description: {
      zh: '把月历格子按客户颜色着色（颜色逻辑已经有了），看一整月谁占了多少天一眼可见。',
      en: 'Tint calendar cells by client color (the color logic already exists) so a month’s workload is visible at a glance.',
    },
    author: 'Chen*',
    city: { zh: '南京', en: 'Nanjing' },
    date: { zh: '6 天前', en: '6 days ago' },
    status: 'merged',
  },
  {
    module: { zh: '任务月历', en: 'Task Calendar' },
    title: { zh: '"今天"按钮固定在月历右上角', en: 'Pin the “Today” button to the top-right' },
    description: {
      zh: '现在藏在工具菜单里，建议常驻可见——跨月翻回当天太频繁了。',
      en: 'It’s buried in the tools menu now; keep it always visible — jumping back to today across months happens constantly.',
    },
    author: 'Wu*',
    city: { zh: '武汉', en: 'Wuhan' },
    date: { zh: '9 天前', en: '9 days ago' },
    status: 'adopted',
  },
  {
    module: { zh: '客户工作台', en: 'Client Workspace' },
    title: { zh: '客户颜色支持 hex 自定义', en: 'Custom hex colors for clients' },
    description: {
      zh: '现在只能从 7 色板选，希望能自由配色，保留团队 / 客户的视觉品牌。',
      en: 'Only seven preset colors today — let us pick any color to keep the team’s or client’s brand identity.',
    },
    author: '吴**',
    city: { zh: '杭州', en: 'Hangzhou' },
    date: { zh: '12 天前', en: '12 days ago' },
    status: 'discussing',
  },
  {
    module: { zh: '客户工作台', en: 'Client Workspace' },
    title: { zh: '支持 ⌘K 快速跳转', en: 'Add ⌘K quick navigation' },
    description: {
      zh: '能用 ⌘K 在客户 / 任务 / 事件线之间秒切，少用三次鼠标。',
      en: 'Use ⌘K to jump instantly between clients, tasks, and timelines — three fewer mouse moves.',
    },
    author: 'He*',
    city: { zh: '北京', en: 'Beijing' },
    date: { zh: '15 天前', en: '15 days ago' },
    status: 'in-progress',
  },
  {
    module: { zh: '任务', en: 'Tasks' },
    title: { zh: '任务卡片支持 Markdown 富文本', en: 'Markdown rich text in task cards' },
    description: {
      zh: '希望任务备注和客户记录里能粘 Markdown，列表 / 标题 / 链接 / 代码块都识别。',
      en: 'Let task notes and client records accept Markdown — lists, headings, links, and code blocks all rendered.',
    },
    author: 'Yuan*',
    city: { zh: '上海', en: 'Shanghai' },
    date: { zh: '19 天前', en: '19 days ago' },
    status: 'evaluating',
  },
  {
    module: { zh: '成长中心', en: 'Growth Center' },
    title: { zh: '徽章加"能力维度颜色码"', en: 'Color-code badges by skill dimension' },
    description: {
      zh: '6 个能力维度配 6 个色，徽章上的色条直接代表它解锁的维度，比文字标更直观。',
      en: 'Map the six skill dimensions to six colors so a badge’s stripe shows what it unlocks — clearer than a text label.',
    },
    author: 'Lin*',
    city: { zh: '苏州', en: 'Suzhou' },
    date: { zh: '23 天前', en: '23 days ago' },
    status: 'adopted',
  },
];

const CB_CSS = `
@keyframes cbBackdropIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cbPanelIn {
  from { opacity: 0; transform: translateY(20px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes cbToastIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes cbEntryIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cb-entry {
  opacity: 0;
  animation: cbEntryIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.cb-entry:hover {
  background: ${ACCENT}08;
}
`;

function useLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  useEffect(() => {
    const check = (): void => {
      setLoggedIn(Boolean(getSavedAuthToken()));
    };
    check();
    window.addEventListener('yiyu_user_updated', check);
    window.addEventListener('storage', check);
    return () => {
      window.removeEventListener('yiyu_user_updated', check);
      window.removeEventListener('storage', check);
    };
  }, []);
  return loggedIn;
}

function StatusPill({ status }: { status: EntryStatus }): JSX.Element {
  const { t } = useLang();
  const tone = STATUS_TONE[status];
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {t(STATUS_LABEL[status])}
    </span>
  );
}

interface EntryRowProps {
  entry: Entry;
  index: number;
  showModule: boolean;
  showVotes: boolean;
}

function EntryRow({ entry, index, showModule, showVotes }: EntryRowProps): JSX.Element {
  const { t } = useLang();
  return (
    <li
      className="cb-entry px-5 py-4 border-b border-os-line/70 last:border-b-0 transition-colors duration-200"
      style={{ animationDelay: `${0.05 + index * 0.04}s` }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h4 className="text-[14px] font-semibold text-os-navy leading-snug">{t(entry.title)}</h4>
        <StatusPill status={entry.status} />
      </div>
      <p className="text-[13px] leading-[1.75] text-os-muted mb-2.5">{t(entry.description)}</p>
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11.5px] text-os-muted/85">
        <span>{entry.author} · {t(entry.city)}</span>
        <span className="text-os-line">·</span>
        <span>{t(entry.date)}</span>
        {showVotes && entry.votes !== undefined && (
          <>
            <span className="text-os-line">·</span>
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" strokeWidth={2.2} />
              {entry.votes}
            </span>
          </>
        )}
        {showModule && entry.module && (
          <span
            className="ml-auto inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: ACCENT_SOFT, color: ACCENT }}
          >
            {t(entry.module)}
          </span>
        )}
      </div>
    </li>
  );
}

interface SectionProps {
  icon: typeof MessageSquare;
  title: string;
  subtitle: string;
  total: number;
  entries: Entry[];
  showModule: boolean;
  showVotes: boolean;
}

function Section({ icon: Icon, title, subtitle, total, entries, showModule, showVotes }: SectionProps): JSX.Element {
  const { t } = useLang();
  return (
    <section className="flex flex-col h-full">
      <header className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px]"
            style={{ background: ACCENT_SOFT }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color: ACCENT }} strokeWidth={2} />
          </span>
          <h3 className="font-serif-display text-[19px] font-semibold text-os-navy">{title}</h3>
          <span className="text-[12px] text-os-muted tabular-nums">{t({ zh: `${total} 条`, en: `${total}` })}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-os-muted/85 pl-12">{subtitle}</p>
      </header>
      <ul
        className="bg-white rounded-[16px] overflow-hidden flex-1"
        style={{ boxShadow: 'inset 0 0 0 1px #E3E6F1, 0 1px 2px rgba(15,23,42,0.04), 0 6px 18px -10px rgba(15,23,42,0.06)' }}
      >
        {entries.map((entry, i) => (
          <EntryRow
            key={entry.title.zh}
            entry={entry}
            index={i}
            showModule={showModule}
            showVotes={showVotes}
          />
        ))}
      </ul>
    </section>
  );
}

interface SubmitDialogProps {
  open: boolean;
  initialCategory: Category;
  onClose: () => void;
  onSubmitted: (cat: Category) => void;
}

function SubmitDialog({ open, initialCategory, onClose, onSubmitted }: SubmitDialogProps): JSX.Element | null {
  const { t } = useLang();
  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [moduleName, setModuleName] = useState<string>('任务月历');

  useEffect(() => {
    if (open) {
      setCategory(initialCategory);
      setTitle('');
      setDesc('');
      setModuleName('任务月历');
    }
  }, [open, initialCategory]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!title.trim()) return;
    // TODO: 接真实 API. 当前 fake submit, 仅前端反馈.
    onSubmitted(category);
    onClose();
  };

  const placeholderTitle =
    category === 'request'
      ? t({ zh: '希望平台增加什么新能力？', en: 'What new capability should the platform add?' })
      : t({ zh: '想优化哪一个现有模块的细节？', en: 'Which existing module detail would you refine?' });

  return (
    <div
      className="absolute inset-0 z-[5] flex items-center justify-center p-6 bg-os-navy/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl ring-1 ring-os-line w-full max-w-[540px] p-7 shadow-[0_20px_60px_-12px_rgba(15,23,42,0.35)] max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif-display text-[20px] font-semibold text-os-navy">{t({ zh: '提交一条共建想法', en: 'Share an idea' })}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t({ zh: '关闭', en: 'Close' })}
            className="text-os-muted hover:text-os-navy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 类别二选一 */}
          <div>
            <div className="text-[13px] font-semibold text-os-navy mb-2">{t({ zh: '这是哪一类？', en: 'Which kind is this?' })}</div>
            <div className="grid grid-cols-2 gap-3">
              <CategoryRadio
                checked={category === 'request'}
                onClick={() => setCategory('request')}
                icon={Sparkles}
                title={t({ zh: '需求', en: 'Request' })}
                subtitle={t({ zh: '希望平台新增的能力（0 → 1）', en: 'A new capability to add (0 → 1)' })}
              />
              <CategoryRadio
                checked={category === 'suggestion'}
                onClick={() => setCategory('suggestion')}
                icon={Wrench}
                title={t({ zh: '模块建议', en: 'Module Suggestion' })}
                subtitle={t({ zh: '现有模块的打磨与改进（1 → 1.1）', en: 'Polish an existing module (1 → 1.1)' })}
              />
            </div>
          </div>

          {category === 'suggestion' && (
            <div>
              <label className="text-[13px] font-semibold text-os-navy mb-1.5 block">{t({ zh: '所属模块', en: 'Module' })}</label>
              <select
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full rounded-lg border border-os-line bg-os-paper px-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-violet/30 focus:border-os-violet/40"
              >
                <option value="任务月历">{t({ zh: '任务月历', en: 'Task Calendar' })}</option>
                <option value="客户工作台">{t({ zh: '客户工作台', en: 'Client Workspace' })}</option>
                <option value="事件线">{t({ zh: '事件线', en: 'Timeline' })}</option>
                <option value="成长中心">{t({ zh: '成长中心', en: 'Growth Center' })}</option>
                <option value="语料库">{t({ zh: '语料库', en: 'Corpus' })}</option>
                <option value="任务">{t({ zh: '任务', en: 'Tasks' })}</option>
                <option value="其他">{t({ zh: '其他', en: 'Other' })}</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-[13px] font-semibold text-os-navy mb-1.5 block">{t({ zh: '标题', en: 'Title' })}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholderTitle}
              maxLength={60}
              className="w-full rounded-lg border border-os-line bg-os-paper px-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-violet/30 focus:border-os-violet/40"
            />
            <div className="mt-1 text-[11px] text-os-muted/70 text-right tabular-nums">{title.length} / 60</div>
          </div>

          <div>
            <label className="text-[13px] font-semibold text-os-navy mb-1.5 block">{t({ zh: '说明', en: 'Details' })}</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={5}
              placeholder={t({ zh: '描述你希望它怎么工作 / 解决了你什么问题 / 你期望的样子...', en: 'Describe how it should work, the problem it solves, and what you’d expect…' })}
              maxLength={400}
              className="w-full rounded-lg border border-os-line bg-os-paper px-3 py-2.5 text-[14px] text-os-ink leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-os-violet/30 focus:border-os-violet/40"
            />
            <div className="mt-1 text-[11px] text-os-muted/70 text-right tabular-nums">{desc.length} / 400</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13.5px] font-medium text-os-muted hover:text-os-navy transition-colors"
            >
              {t({ zh: '取消', en: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 text-[13.5px] font-semibold text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{ background: ACCENT }}
            >
              {t({ zh: '提交', en: 'Submit' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CategoryRadioProps {
  checked: boolean;
  onClick: () => void;
  icon: typeof MessageSquare;
  title: string;
  subtitle: string;
}

function CategoryRadio({ checked, onClick, icon: Icon, title, subtitle }: CategoryRadioProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl px-3.5 py-3 transition-all"
      style={{
        background: checked ? ACCENT_SOFT : '#F7F8FC',
        boxShadow: checked ? `inset 0 0 0 1.5px ${ACCENT}` : 'inset 0 0 0 1px #E3E6F1',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: checked ? ACCENT : '#5A6178' }} strokeWidth={2.2} />
        <span
          className="text-[13.5px] font-semibold"
          style={{ color: checked ? ACCENT : '#16265E' }}
        >
          {title}
        </span>
      </div>
      <div className="text-[11.5px] text-os-muted leading-snug pl-6">{subtitle}</div>
    </button>
  );
}

interface CommunityBoardDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CommunityBoardDrawer({ open, onClose }: CommunityBoardDrawerProps): JSX.Element | null {
  const { t } = useLang();
  const loggedIn = useLoggedIn();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogCategory, setDialogCategory] = useState<Category>('request');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (dialogOpen) {
          setDialogOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, dialogOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmitted = (cat: Category): void => {
    setToast(
      cat === 'request'
        ? t({ zh: '需求已收到，我们会尽快回复你', en: 'Request received — we’ll get back to you soon' })
        : t({ zh: '建议已收到，我们会尽快回复你', en: 'Suggestion received — we’ll get back to you soon' }),
    );
  };

  const openDialog = (cat: Category): void => {
    setDialogCategory(cat);
    setDialogOpen(true);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t({ zh: '共建参与 · 需求与模块建议', en: 'Co-build · Requests and module suggestions' })}
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-8"
    >
      <style>{CB_CSS}</style>

      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-os-navy/45"
        style={{
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          animation: 'cbBackdropIn 0.28s ease both',
        }}
      />

      <div
        className="relative w-full sm:max-w-[1080px] max-h-screen sm:max-h-[88vh] overflow-y-auto rounded-none sm:rounded-3xl bg-os-canvas shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-os-line"
        style={{ animation: 'cbPanelIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ zh: '关闭', en: 'Close' })}
          className="sticky top-4 ml-auto mr-4 z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-white text-os-muted ring-1 ring-os-line hover:text-os-navy hover:ring-os-navy/30 transition-all hover:scale-105 float-right"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 sm:px-12 pt-10 sm:pt-12 pb-10">
          {/* Hero */}
          <div className="mb-10">
            <div
              className="w-11 h-11 rounded-[13px] flex items-center justify-center mb-5"
              style={{ background: ACCENT_SOFT }}
              aria-hidden
            >
              <MessageSquare className="w-5 h-5" style={{ color: ACCENT }} strokeWidth={1.9} />
            </div>
            <div className="inline-block text-[12px] uppercase font-bold tracking-[0.16em] mb-3" style={{ color: ACCENT }}>
              {t({ zh: '共建参与', en: 'Co-build' })}
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[36px] font-semibold leading-[1.28] tracking-tight text-os-navy mb-4">
              {t({ zh: '你提的每一条，都会被看到', en: 'Every idea you raise gets seen' })}
            </h2>
            <p className="text-[15px] leading-[1.85] text-os-muted max-w-[680px]">
              {t({
                zh: '这里是行动者、开发者和早期用户对平台提的需求与模块建议。每一条都有处理状态，已合并和已采纳的真的会上线。',
                en: 'Here are the requests and module suggestions raised by practitioners, developers, and early users. Each carries a status — the merged and adopted ones really do ship.',
              })}
            </p>
          </div>

          {/* 左右两栏 */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            <Section
              icon={Sparkles}
              title={t({ zh: '需求', en: 'Requests' })}
              subtitle={t({ zh: '希望平台新增的能力（0 → 1）', en: 'New capabilities to add (0 → 1)' })}
              total={218}
              entries={REQUESTS}
              showModule={false}
              showVotes
            />
            <Section
              icon={Wrench}
              title={t({ zh: '模块建议', en: 'Module Suggestions' })}
              subtitle={t({ zh: '现有模块的打磨与改进（1 → 1.1）', en: 'Polishing existing modules (1 → 1.1)' })}
              total={212}
              entries={SUGGESTIONS}
              showModule
              showVotes={false}
            />
          </div>

          {/* 底部居中的 + 按钮 */}
          <div className="mt-12 flex flex-col items-center gap-2">
            {loggedIn ? (
              <button
                type="button"
                onClick={() => openDialog('request')}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14.5px] font-semibold text-white shadow-os hover:shadow-os-lg transition-all hover:scale-[1.03]"
                style={{ background: ACCENT }}
              >
                <Plus className="w-4 h-4" strokeWidth={2.4} />
                {t({ zh: '提交一条共建想法', en: 'Share an idea' })}
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14.5px] font-medium text-os-muted/70 ring-1 ring-os-line cursor-not-allowed"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                {t({ zh: '登录后即可提交想法', en: 'Sign in to share an idea' })}
              </button>
            )}
            <span className="text-[12px] text-os-muted/70 mt-0.5">
              {loggedIn
                ? t({ zh: '需求或建议都可以，点击后在弹窗里二选一', en: 'Request or suggestion — pick one in the dialog after clicking' })
                : t({ zh: '登录之后右下角 + 任何时候都能打开', en: 'Once signed in, the + button at the bottom-right opens it anytime' })}
            </span>
          </div>
        </div>

        {/* 提交弹窗 */}
        <SubmitDialog
          open={dialogOpen}
          initialCategory={dialogCategory}
          onClose={() => setDialogOpen(false)}
          onSubmitted={handleSubmitted}
        />

        {/* 提交成功 toast */}
        {toast && (
          <div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[6] bg-white rounded-full ring-1 ring-os-line px-5 py-2.5 text-[13.5px] font-medium text-os-navy shadow-[0_12px_28px_-8px_rgba(15,23,42,0.25)]"
            style={{ animation: 'cbToastIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
              {toast}
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
