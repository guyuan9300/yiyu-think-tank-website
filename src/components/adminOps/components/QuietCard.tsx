import React from 'react';

export function QuietCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'info';
}) {
  const toneColor = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-indigo-50 text-indigo-700',
  }[tone];

  return (
    <div
      tabIndex={0}
      className="bg-white border border-[#E9ECF2] rounded-[16px] p-5 shadow-[0_10px_40px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-[2px] hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-[#64748B]">{label}</p>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${toneColor}`}>—</span>
      </div>
      <div className="mt-2 text-[30px] leading-none font-semibold text-[#0F172A]">{value}</div>
      {hint ? <div className="mt-3 text-[12px] text-[#94A3B8]">{hint}</div> : null}
      <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full w-[42%] bg-indigo-200 rounded-full" />
      </div>
    </div>
  );
}
