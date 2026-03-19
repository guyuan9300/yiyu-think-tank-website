import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, currentPage - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, index) => windowStart + index);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="text-sm text-muted-foreground/70">
        第 <span className="font-medium text-foreground">{currentPage}</span> / {totalPages} 页，共 {totalItems} 条
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          上一页
        </button>

        <div className="flex items-center gap-1">
          {pages.map((page) => (
            <button
              key={page}
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
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
