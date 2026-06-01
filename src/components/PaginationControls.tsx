import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '../lib/i18n';

export function PaginationControls({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = '',
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { t } = useLang();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, currentPage - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, index) => windowStart + index);

  return (
    <div
      data-yiyu-pagination="content"
      data-yiyu-pagination-current={String(currentPage)}
      data-yiyu-pagination-total={String(totalPages)}
      className={`flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div data-yiyu-results-summary="content" className="text-sm text-muted-foreground/70">
        {t({ zh: '第', en: 'Page' })} <span className="font-medium text-foreground">{currentPage}</span> / {totalPages} {t({ zh: '页，共', en: '·' })} {totalItems} {t({ zh: '条', en: 'total' })}
      </div>

      <div className="flex items-center gap-2">
        <button
          data-yiyu-pagination-prev="content"
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          {t({ zh: '上一页', en: 'Previous' })}
        </button>

        <div className="flex items-center gap-1">
          {pages.map((page) => (
            <button
              key={page}
              data-yiyu-pagination-page={String(page)}
              data-yiyu-pagination-page-active={page === currentPage ? 'true' : 'false'}
              type="button"
              onClick={() => onPageChange(page)}
              className={`min-w-10 rounded-full px-3 py-2 text-sm transition-colors ${
                page === currentPage
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border/60 text-foreground hover:bg-muted/40'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          data-yiyu-pagination-next="content"
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t({ zh: '下一页', en: 'Next' })}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
