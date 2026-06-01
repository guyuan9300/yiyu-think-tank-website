// 搬自益语智库 2.1：src/renderer/components/tasks/UnderstandingPanel.tsx
// 与软件原件的差异（已审核，故意保留）：
//   1) 类型 import 改成本地相对路径（types 单独提取到 ./understandingTypes.ts）
//   2) "依据与调试" <details> 标签加了 open 属性 —— Hero 首屏即展开 chip 行，
//      让访客一眼看到 AI 的置信/覆盖/模式/来源密度。这是官网展示侧的定制，不在软件里。
// 其余 JSX / 文案 / 类名 / 行为均与软件原件字节级一致（已用 diff 验证）。
import type { UnderstandingSnapshotV1 } from './understandingTypes';
import { useLang, type Bilingual } from '../../../../lib/i18n';

function confidenceBadge(confidence: number): { label: Bilingual; className: string } {
  if (confidence >= 70) return { label: { zh: '高置信', en: 'High confidence' }, className: 'bg-emerald-50 text-emerald-700' };
  if (confidence >= 40) return { label: { zh: '中置信', en: 'Medium confidence' }, className: 'bg-amber-50 text-amber-700' };
  return { label: { zh: '低置信', en: 'Low confidence' }, className: 'bg-slate-100 text-slate-500' };
}

const BRIEF_FALLBACK: Bilingual = {
  zh: '这项任务还缺少可用于生成理解简报的信息，建议先补齐任务目标、背景资料和下一步交付标准。',
  en: 'This task still lacks the information needed to generate an understanding brief. Start by filling in the goal, background, and the next deliverable standard.',
};

function compactParts(parts: Array<string | null | undefined>) {
  return parts.map((part) => (part ?? '').trim()).filter(Boolean).join(' ');
}

function resolveHumanBrief(snapshot: UnderstandingSnapshotV1, fallback: string) {
  const direct = snapshot.humanBrief?.trim();
  if (direct) return direct;

  return (
    compactParts([
      snapshot.whatIsThis,
      snapshot.whyItMatters,
      snapshot.progressNow,
      snapshot.unknowns,
    ]) || fallback
  );
}

type UnderstandingPanelProps = {
  snapshot: UnderstandingSnapshotV1;
};

export function UnderstandingPanel({ snapshot }: UnderstandingPanelProps) {
  const { t } = useLang();
  const badge = confidenceBadge(snapshot.confidence);
  const sourceBreakdown = snapshot.sourceBreakdown ?? [];
  const knownFacts = snapshot.knownFacts ?? [];
  const humanBrief = resolveHumanBrief(snapshot, t(BRIEF_FALLBACK));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-50 px-4 py-3">
        <p className="text-[13px] leading-6 text-gray-800">{humanBrief}</p>
      </div>

      <details className="group rounded-2xl border border-slate-100 bg-white/80 px-4 py-3" open>
        <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-400 transition hover:text-slate-600">
          {t({ zh: '依据与调试', en: 'Evidence & Debug' })}
        </summary>

        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.className}`}>{t(badge.label)}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {t({ zh: `覆盖 ${snapshot.coverage}%`, en: `Coverage ${snapshot.coverage}%` })}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#33449a]">
              {snapshot.mode === 'enhanced' ? t({ zh: '增强模式', en: 'Enhanced mode' }) : t({ zh: '基础模式', en: 'Basic mode' })}
            </span>
            {sourceBreakdown.filter((s) => s.available).map((s) => (
              <span key={s.sourceType} className="rounded-full bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-gray-400">
                {s.label}
              </span>
            ))}
          </div>

          <div className="space-y-2.5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t({ zh: '这是什么事', en: 'What this is' })}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-gray-800">{snapshot.whatIsThis}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t({ zh: '为什么重要', en: 'Why it matters' })}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-gray-800">{snapshot.whyItMatters}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t({ zh: '推进到哪', en: 'Where it stands' })}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-gray-800">{snapshot.progressNow}</p>
            </div>
            <div className="rounded-2xl bg-amber-50/50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">{t({ zh: '还缺什么理解', en: 'What’s still unclear' })}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-gray-800">{snapshot.unknowns}</p>
            </div>
          </div>

          {knownFacts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {knownFacts.map((fact) => (
                <span key={fact} className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] text-gray-500">{fact}</span>
              ))}
            </div>
          )}

          {snapshot.optionalAdvice && (
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-white px-4 py-3">
              {snapshot.optionalAdvice.timeGate && (
                <p className="text-[12px] leading-5 text-red-600">
                  <span className="font-bold">{t({ zh: '时间闸门：', en: 'Time gate: ' })}</span>{snapshot.optionalAdvice.timeGate}
                </p>
              )}
              {snapshot.optionalAdvice.realBlocker && (
                <p className="text-[12px] leading-5 text-amber-700">
                  <span className="font-bold">{t({ zh: '真正阻碍：', en: 'Real blocker: ' })}</span>{snapshot.optionalAdvice.realBlocker}
                </p>
              )}
              {snapshot.optionalAdvice.minimumAction && (
                <p className="text-[12px] leading-5 text-[#33449a]">
                  <span className="font-bold">{t({ zh: '最小动作：', en: 'Minimum action: ' })}</span>{snapshot.optionalAdvice.minimumAction}
                </p>
              )}
              {snapshot.optionalAdvice.supportAsk && (
                <p className="text-[12px] leading-5 text-gray-600">
                  <span className="font-bold">{t({ zh: '需要支持：', en: 'Support needed: ' })}</span>{snapshot.optionalAdvice.supportAsk}
                </p>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
