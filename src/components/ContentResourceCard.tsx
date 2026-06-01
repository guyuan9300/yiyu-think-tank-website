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
    <div className="flex items-center gap-4 text-[12px] text-os-muted/60">
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

// 标签胶囊 (os 调色板)
function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap min-h-[26px]">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className="px-2.5 py-1 rounded-full bg-os-mist text-os-indigo text-[11px] font-medium ring-1 ring-os-line"
        >
          {tag}
        </span>
      ))}
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

  // 封面图填满容器 + 隐藏裂图 alt 文字(text-transparent), 缺图时露出底层 os 渐变
  const coverFx = '[&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:text-transparent';

  if (variant === 'list') {
    return (
      <div
        {...cardDataAttributes}
        className="feature-motion-card group flex gap-6 rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os p-5 text-left overflow-hidden transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-os-lg hover:ring-os-violet/45 cursor-pointer"
        onClick={onClick}
      >
        <div className={`relative w-[132px] sm:w-[168px] aspect-[3/4] rounded-[16px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-os-mist to-os-paper shadow-os ${coverFx}`}>
          {cover}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <TagPills tags={tags} />
          <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold text-os-navy leading-[1.4] line-clamp-2">
            {title}
          </h3>
          <p className={`mt-1.5 text-[13px] line-clamp-1 ${author ? 'text-os-muted/70' : 'hidden'}`}>
            {author || '—'}
          </p>
          <p className={`mt-3 text-[14px] leading-[1.7] line-clamp-3 ${excerpt ? 'text-os-muted' : 'invisible'}`}>
            {excerpt || '—'}
          </p>
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-os-line pt-4 relative z-[1]">
            <Metrics views={views} likes={likes} favorites={favorites} />
            <span className="text-[12px] text-os-muted/60 whitespace-nowrap">{publishDate || '-'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article {...cardDataAttributes} className="group h-full cursor-pointer" onClick={onClick}>
      <div className="feature-motion-card h-full overflow-hidden rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-os-lg hover:ring-os-violet/45 flex flex-col">
        <div className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-os-mist to-os-paper ${coverFx}`}>
          {cover}
        </div>

        <div className="p-6 flex flex-1 flex-col">
          <TagPills tags={tags} />
          <h3 className="font-serif-display min-h-[3.1rem] text-[18px] font-semibold leading-[1.4] text-os-navy line-clamp-2">
            {title}
          </h3>
          <p className={`mt-2 min-h-[1.25rem] text-[13px] line-clamp-1 ${author ? 'text-os-muted/70' : 'invisible'}`}>
            {author || '—'}
          </p>
          <p className={`mt-3 min-h-[3rem] text-[14px] leading-[1.6] line-clamp-2 ${excerpt ? 'text-os-muted' : 'invisible'}`}>
            {excerpt || '—'}
          </p>
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-os-line pt-4 relative z-[1]">
            <Metrics views={views} likes={likes} favorites={favorites} />
            <span className="text-[12px] text-os-muted/60 whitespace-nowrap">{publishDate || '-'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
