import React from 'react';

export type SectionState = 'ready' | 'loading' | 'empty' | 'error';

export function SectionCard({
  title,
  subtitle,
  right,
  state = 'ready',
  onRetry,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  state?: SectionState;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[#E9ECF2] rounded-[18px] shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
      <header className="px-6 py-5 border-b border-[#EEF2F7] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[#0F172A] leading-tight truncate">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-[12px] text-[#64748B] leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="flex-shrink-0">{right}</div> : null}
      </header>

      <div className="p-6">
        {state === 'loading' ? (
          <div className="space-y-3">
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
          </div>
        ) : state === 'empty' ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-[#64748B]">暂无数据</p>
          </div>
        ) : state === 'error' ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-[#64748B]">发生错误（ERR-0001）</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-[12px] border border-[#E9ECF2] text-[13px] text-[#0F172A] hover:bg-slate-50"
              >
                重试
              </button>
            ) : null}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
