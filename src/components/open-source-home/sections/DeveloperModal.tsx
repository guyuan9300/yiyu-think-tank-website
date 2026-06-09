import { useEffect } from 'react';
import { X, Code2, ArrowUpRight, Github, Plus } from 'lucide-react';
import { useLang, type Bilingual } from '../../../lib/i18n';
import { GITHUB_URL } from '../links';

type Level = 'light' | 'medium' | 'advanced';
type Module = {
  name: Bilingual;
  skill: Bilingual;
  level: Level;
  desc: Bilingual;
};

// 全部来自产品手册真实路线图(正向措辞)。"认领" → GitHub 预填新建 issue,开发者亲手提交。
const MODULES: Module[] = [
  {
    name: { zh: '跨端到点提醒引擎', en: 'Cross-device due-time reminders' },
    skill: { zh: '后端', en: 'Backend' },
    level: 'advanced',
    desc: { zh: '让「你自己设的任务到点了」也能跨端响铃 —— 现在只有协作任务被别人改动时才会推送。', en: 'Make your own task due-times ring across devices — today only collaborator edits get pushed.' },
  },
  {
    name: { zh: '深读引擎调度', en: 'Deep-read worker scheduling' },
    skill: { zh: '后端 · AI', en: 'Backend · AI' },
    level: 'medium',
    desc: { zh: '重启并排期文档「深读 / 深度研判」,让每个客户都有深读卡片(现仅 3 个客户跑过)。', en: 'Restart and schedule the document deep-read worker so every client gets deep insights (only 3 do today).' },
  },
  {
    name: { zh: '飞书文档同步打通', en: 'Feishu doc sync' },
    skill: { zh: '后端', en: 'Backend' },
    level: 'medium',
    desc: { zh: '把「软件内创建文档 → 飞书 docx」的组织集成 + 成员授权 + 同步流程完整跑通。', en: 'Wire up the org integration, member auth, and sync for “create a doc → Feishu docx.”' },
  },
  {
    name: { zh: '手机离线任务重连', en: 'Mobile offline task resync' },
    skill: { zh: '移动 / RN', en: 'Mobile / RN' },
    level: 'medium',
    desc: { zh: '离线建的任务联网后自动重发、不丢失(现在重试耗尽就会标「需处理」)。', en: 'Auto-resend offline-created tasks once back online so none are lost (today they stall after retries).' },
  },
  {
    name: { zh: '智能填表接结构化表', en: 'Form-fill from structured tables' },
    skill: { zh: '后端 · AI', en: 'Backend · AI' },
    level: 'medium',
    desc: { zh: '把人员花名册 / 财务表接进智能填表,补上「团队规模 / 财务」这类字段。', en: 'Feed roster & finance tables into smart form-fill to cover “team size / finance” fields.' },
  },
  {
    name: { zh: '软件内反馈接线', en: 'In-app feedback wiring' },
    skill: { zh: '前端', en: 'Frontend' },
    level: 'light',
    desc: { zh: '把「提交反馈」从纯界面接到云端端点(后端已就绪),轻量、好上手。', en: 'Connect the in-app feedback form to the ready cloud endpoint — light and beginner-friendly.' },
  },
];

const LEVEL_LABEL: Record<Level, Bilingual> = {
  light: { zh: '轻量', en: 'Light' },
  medium: { zh: '中等', en: 'Medium' },
  advanced: { zh: '进阶', en: 'Advanced' },
};
const LEVEL_CLS: Record<Level, string> = {
  light: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  medium: 'bg-os-mist text-os-blue ring-os-blue/20',
  advanced: 'bg-os-spark-soft text-os-spark ring-os-spark/25',
};

function claimUrl(m: Module): string {
  const title = `[认领] ${m.name.zh}`;
  const body = [
    '## 我想认领这个模块 / I’d like to claim this module',
    '',
    `**模块 / Module**: ${m.name.zh}`,
    `**技能 / Skill**: ${m.skill.zh} · **难度 / Level**: ${LEVEL_LABEL[m.level].zh}`,
    '',
    `**它要解决什么 / What it solves**: ${m.desc.zh}`,
    '',
    '---',
    '我能投入的时间 / 相关经验 / 初步思路：',
    '（My availability / relevant experience / initial approach:）',
    '',
  ].join('\n');
  return `${GITHUB_URL}/issues/new?title=${encodeURIComponent(title)}&labels=${encodeURIComponent('help wanted')}&body=${encodeURIComponent(body)}`;
}

export function DeveloperModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-os-navy/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-os-muted hover:bg-os-mist hover:text-os-navy transition" aria-label="Close"><X className="w-4 h-4" /></button>

        {/* 头部 */}
        <div className="px-7 pt-7 pb-4 shrink-0">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-os-mist text-os-blue ring-1 ring-os-blue/15 mb-4"><Code2 className="h-5 w-5" /></div>
          <h3 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '认领一个模块', en: 'Claim a Module' })}</h3>
          <p className="mt-2 text-[13.5px] leading-[1.8] text-os-muted">{t({ zh: '挑一个你感兴趣的模块 —— 门槛不在「大神」，在「愿意动手」。点「认领」会跳到 GitHub 的新建 issue（已预填好），你稍改、提交就完成认领，我们陪你把它做出来。', en: 'Pick a module that interests you — the bar is not “genius,” it’s “willing to build.” “Claim” opens a pre-filled GitHub issue; edit and submit to claim it, and we’ll build it with you.' })}</p>
        </div>

        {/* 模块清单(可滚) */}
        <div className="px-7 pb-3 space-y-3 overflow-y-auto">
          {MODULES.map((m) => (
            <div key={m.name.zh} className="group rounded-2xl ring-1 ring-os-line bg-os-canvas/60 p-4 transition hover:ring-os-navy/20 hover:bg-os-canvas">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h4 className="text-[15px] font-semibold text-os-ink">{t(m.name)}</h4>
                    <span className="text-[11px] font-medium text-os-muted">{t(m.skill)}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${LEVEL_CLS[m.level]}`}>{t(LEVEL_LABEL[m.level])}</span>
                  </div>
                  <p className="text-[13px] leading-[1.7] text-os-muted">{t(m.desc)}</p>
                </div>
                <a
                  href={claimUrl(m)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-os-paper px-4 py-2 text-[13px] font-semibold text-os-navy ring-1 ring-os-navy/15 hover:ring-os-navy/40 hover:bg-os-mist/50 transition"
                >
                  {t({ zh: '认领', en: 'Claim' })}<ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className="px-7 py-4 shrink-0 border-t border-os-line flex flex-col sm:flex-row items-center justify-between gap-2">
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-os-navy hover:text-os-blue transition"><Github className="w-4 h-4" />{t({ zh: '去 GitHub 看全部 issue', en: 'See all issues on GitHub' })}</a>
          <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition"><Plus className="w-4 h-4" />{t({ zh: '没有合适的？提个新想法', en: 'Nothing fits? Propose an idea' })}</a>
        </div>
      </div>
    </div>
  );
}
