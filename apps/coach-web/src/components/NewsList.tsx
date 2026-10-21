import { useState } from 'react';
import type { MouseEvent } from 'react';
import { formatShortDate } from '../lib/format';
import { getLocale, messages } from '../lib/i18n';
import { openExternalLink } from '../lib/telegram';
import type { NewsItem } from '../types';
import { useResource } from '../hooks/useResource';
import { Card, ErrorState, Loading } from './ui';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

function formatPublished(iso: string): string {
  const ago = Math.max(0, Date.now() - new Date(iso).getTime());
  if (ago >= 7 * DAY_MS) return formatShortDate(iso);
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  if (ago < HOUR_MS) return format.format(-Math.max(1, Math.floor(ago / 60_000)), 'minute');
  if (ago < DAY_MS) return format.format(-Math.floor(ago / HOUR_MS), 'hour');
  return format.format(-Math.floor(ago / DAY_MS), 'day');
}

function NewsImage({ src }: { readonly src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-16 w-24 shrink-0 rounded-lg bg-bg-elevated object-cover" />;
}

export function NewsList({ news }: { readonly news: readonly NewsItem[] }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (openExternalLink(url)) e.preventDefault();
  };

  return (
    <Card className="divide-y divide-border-subtle">
      {news.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => onClick(e, item.url)}
          className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-bg-elevated/60"
        >
          {item.image && <NewsImage src={item.image} />}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
            <span className="truncate text-xs text-text-muted">
              {item.source ? `${item.source} · ` : ''}
              <time dateTime={item.publishedAt}>{formatPublished(item.publishedAt)}</time>
            </span>
          </span>
        </a>
      ))}
    </Card>
  );
}

// Mount only while a news tab is active, so news is fetched on demand.
export function NewsFeed({ load, cacheKey }: { readonly load: () => Promise<NewsItem[]>; readonly cacheKey: string }) {
  const resource = useResource(load, cacheKey);
  if (resource.errorStatus !== null && !resource.data) return <ErrorState status={resource.errorStatus} onRetry={resource.reload} />;
  if (!resource.data) return <Loading />;
  if (!resource.data.length) return <Card className="px-4 py-6 text-center text-sm text-text-muted">{messages().common.noNews}</Card>;
  return <NewsList news={resource.data} />;
}
