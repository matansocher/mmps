import { formatTime } from '../lib/date';
import type { EventDto } from '../types';

type Props = { readonly event: EventDto };

export function EventRow({ event }: Props) {
  const time = !event.isAllDay && !event.start.includes('T00:00:00') ? formatTime(event.start) : 'All day';
  const accent = event.isBirthday ? 'text-accent-birthday' : 'text-text-secondary';

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`w-14 shrink-0 text-xs tabular ${accent}`}>{event.isBirthday ? '🎂' : time}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{event.summary}</div>
        {event.location && <div className="text-xs text-text-muted truncate">📍 {event.location}</div>}
      </div>
    </div>
  );
}
