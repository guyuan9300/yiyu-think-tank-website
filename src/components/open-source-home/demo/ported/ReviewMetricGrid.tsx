// 原样搬自益语智库 2.1：src/renderer/components/tasks/ReviewMetricGrid.tsx
// 仅把类型 import 改成本地路径，其余保持与软件一致。
import type { ReviewMetricCard } from './understandingTypes';
import { useLang } from '../../../../lib/i18n';

type ReviewMetricGridProps = {
  metrics: ReviewMetricCard[];
};

function toneClasses(tone: ReviewMetricCard['tone']) {
  if (tone === 'positive') return 'border-emerald-100 bg-emerald-50/70 text-emerald-900';
  if (tone === 'neutral') return 'border-slate-200 bg-slate-50 text-slate-800';
  if (tone === 'warning') return 'border-amber-100 bg-amber-50 text-amber-900';
  return 'border-rose-100 bg-rose-50 text-rose-900';
}

export function ReviewMetricGrid({ metrics }: ReviewMetricGridProps) {
  const { t } = useLang();
  if (!metrics.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.key} className={`rounded-3xl border px-4 py-4 ${toneClasses(metric.tone)}`}>
          <p className="text-[12px] font-bold opacity-80">{metric.label}</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-[26px] font-bold leading-none">{metric.valueText}</p>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold">
              {metric.denominator > 0 ? `${metric.numerator}/${metric.denominator}` : t({ zh: '待补录', en: 'Pending' })}
            </span>
          </div>
          <p className="mt-3 text-[12px] leading-5 opacity-80">{metric.description}</p>
        </div>
      ))}
    </div>
  );
}
