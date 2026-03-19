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
  author?: string | null;
  excerpt?: string | null;
  views?: MetricValue;
  likes?: MetricValue;
  favorites?: MetricValue;
  publishDate?: string;
  onClick?: () => void;
  variant?: 'grid' | 'list';
}) {
  if (variant === 'list') {
    return (
      <div
        className="group flex gap-6 rounded-[24px] border border-border/40 bg-white/70 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-border/60 hover:bg-white/90 hover:shadow-[0_20px_60px_-45px_rgba(0,0,0,0.35)] cursor-pointer"
        onClick={onClick}
      >
        <div className="w-36 h-24 rounded-[16px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]">
          {cover}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/12"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="text-[18px] font-semibold text-foreground leading-[1.4] line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {author ? (
            <p className="mt-2 text-[13px] text-muted-foreground/55 line-clamp-1">
              {author}
            </p>
          ) : null}

          {excerpt ? (
            <p className="mt-2 text-[14px] text-muted-foreground/72 line-clamp-2 leading-[1.6]">
              {excerpt}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/30 pt-4">
            <Metrics views={views} likes={likes} favorites={favorites} />
            <span className="text-[12px] text-muted-foreground/55 whitespace-nowrap">{publishDate || '-'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:bg-white/90 hover:shadow-[0_24px_70px_-45px_rgba(0,0,0,0.35)]">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]">
          {cover}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/12"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="text-[18px] font-semibold leading-[1.4] text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {author ? (
            <p className="mt-2 text-[13px] text-muted-foreground/55 line-clamp-1">
              {author}
            </p>
          ) : null}

          {excerpt ? (
            <p className="mt-3 text-[14px] text-muted-foreground/72 line-clamp-2 leading-[1.6]">
              {excerpt}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-border/30 pt-4">
            <Metrics views={views} likes={likes} favorites={favorites} />
            <span className="text-[12px] text-muted-foreground/55 whitespace-nowrap">{publishDate || '-'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
