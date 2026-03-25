import type { ReactNode } from 'react';
import { Bookmark, Eye, Heart } from 'lucide-react';

type MetricValue = number | string | undefined;

function formatMetric(value: MetricValue) {
  if (typeof value === 'number') return value.toLocaleString();
  return value || '0';
}

function Metrics({
  views,
  likes,
  favorites,
}: {
  views?: MetricValue;
  likes?: MetricValue;
  favorites?: MetricValue;
}) {
  return (
    <div className="flex items-center gap-4 text-[12px] text-muted-foreground/55">
      <span className="flex items-center gap-1">
        <Eye className="w-3.5 h-3.5" />
        {formatMetric(views)}
      </span>
      <span className="flex items-center gap-1">
        <Heart className="w-3.5 h-3.5" />
        {formatMetric(likes)}
      </span>
      <span className="flex items-center gap-1">
        <Bookmark className="w-3.5 h-3.5" />
        {formatMetric(favorites)}
      </span>
    </div>
  );
}

export function ContentResourceCard({
  cover,
  tags,
  title,
  contentId,
  contentType,
  author,
  excerpt,
  views,
  likes,
  favorites,
  publishDate,
  onClick,
  variant = 'grid',
}: {
  cover: ReactNode;
  tags: string[];
  title: string;
  contentId?: string;
  contentType?: string;
  author?: string | null;
  excerpt?: string | null;
  views?: MetricValue;
  likes?: MetricValue;
  favorites?: MetricValue;
  publishDate?: string;
  onClick?: () => void;
  variant?: 'grid' | 'list';
}) {
  const cardDataAttributes = {
    'data-yiyu-card': 'content',
    'data-yiyu-card-id': contentId || '',
    'data-yiyu-card-type': contentType || '',
    'data-yiyu-card-enterable': onClick ? 'true' : 'false',
    'data-yiyu-card-title': title,
    'data-yiyu-card-author': author || '',
    'data-yiyu-card-tags': tags.join('|'),
    'data-yiyu-card-publish-date': publishDate || '',
    'data-yiyu-card-views': String(views ?? 0),
    'data-yiyu-card-likes': String(likes ?? 0),
    'data-yiyu-card-favorites': String(favorites ?? 0),
  } as const;

  if (variant === 'list') {
    return (
      <div
        {...cardDataAttributes}
        className="group flex gap-6 rounded-[24px] border border-border/40 bg-white/70 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-border/60 hover:bg-white/90 hover:shadow-[0_20px_60px_-45px_rgba(0,0,0,0.35)] cursor-pointer"
        onClick={onClick}
      >
        <div className="w-36 h-24 rounded-[16px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]">
          {cover}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 mb-3 flex-wrap min-h-[28px]">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/12"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="min-h-[1.8rem] text-[18px] font-semibold text-foreground leading-[1.4] line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className={`mt-2 min-h-[1.25rem] text-[13px] line-clamp-1 ${author ? 'text-muted-foreground/55' : 'invisible'}`}>
            {author || '—'}
          </p>

          <p className={`mt-2 min-h-[2.9rem] text-[14px] leading-[1.6] line-clamp-2 ${excerpt ? 'text-muted-foreground/72' : 'invisible'}`}>
            {excerpt || '—'}
          </p>

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/30 pt-4">
            <Metrics views={views} likes={likes} favorites={favorites} />
            <span className="text-[12px] text-muted-foreground/55 whitespace-nowrap">{publishDate || '-'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article {...cardDataAttributes} className="group h-full cursor-pointer" onClick={onClick}>
      <div className="h-full overflow-hidden rounded-3xl border border-border/40 bg-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:bg-white/90 hover:shadow-[0_24px_70px_-45px_rgba(0,0,0,0.35)] flex flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]">
          {cover}
        </div>

        <div className="p-6 flex flex-1 flex-col">
          <div className="flex items-center gap-2 mb-3 flex-wrap min-h-[28px]">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/12"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="min-h-[3.2rem] text-[18px] font-semibold leading-[1.4] text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className={`mt-2 min-h-[1.25rem] text-[13px] line-clamp-1 ${author ? 'text-muted-foreground/55' : 'invisible'}`}>
            {author || '—'}
          </p>

          <p className={`mt-3 min-h-[3rem] text-[14px] leading-[1.6] line-clamp-2 ${excerpt ? 'text-muted-foreground/72' : 'invisible'}`}>
            {excerpt || '—'}
          </p>

          <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/30 pt-4">
            <Metrics views={views} likes={likes} favorites={favorites} />
            <span className="text-[12px] text-muted-foreground/55 whitespace-nowrap">{publishDate || '-'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
