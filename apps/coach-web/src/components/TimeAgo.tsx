import { useNow } from '../hooks/useNow';
import { getLocale } from '../lib/i18n';

const MINUTE = 60;
const HOUR = 60 * MINUTE;

function formatAgo(seconds: number): string {
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  if (seconds < MINUTE) return format.format(-seconds, 'second');
  if (seconds < HOUR) return format.format(-Math.floor(seconds / MINUTE), 'minute');
  return format.format(-Math.floor(seconds / HOUR), 'hour');
}

// Ticks every second on its own so the rest of the page doesn't re-render.
export function TimeAgo({ iso }: { readonly iso: string }) {
  const now = useNow(1000);
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  return (
    <time dateTime={iso} className="tabular-nums">
      {formatAgo(seconds)}
    </time>
  );
}
