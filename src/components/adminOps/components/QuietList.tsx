import React from 'react';
import { ChevronRight } from 'lucide-react';

export function QuietList({
  items,
}: {
  items: Array<{ title: string; subtitle?: string; badge?: string; tone?: 'neutral' | 'warn' | 'danger' | 'info' }>;
}) {
  const badgeCls = (tone?: string) => {
    if (tone === 'warn') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (tone === 'danger') return 'bg-rose-50 text-rose-700 border-rose-100';
    if (tone === 'info') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  return (
    <div className="divide-y divide-[#EEF2F7]">
      {items.map((it, idx) => (
        <button
          key={idx}
          type="button"
          className="w-full text-left px-4 py-3 rounded-[12px] hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[14px] text-[#0F172A] font-medium truncate">{it.title}</p>
              {it.badge ? (
                <span className={`px-2 py-0.5 rounded-full text-[11px] border ${badgeCls(it.tone)}`}>{it.badge}</span>
              ) : null}
            </div>
            {it.subtitle ? <p className="mt-0.5 text-[12px] text-[#64748B] truncate">{it.subtitle}</p> : null}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}
