import { formatTime } from '../lib/date';
import type { EventDto } from '../types';

type Props = {
  readonly event: EventDto;
  readonly onDelete?: (event: EventDto) => void;
};

export function EventRow({ event, onDelete }: Props) {
  const time = !event.isAllDay && !event.start.includes('T00:00:00') ? formatTime(event.start) : 'All day';
  const accent = event.isBirthday ? 'text-accent-birthday' : 'text-text-secondary';
  const showDelete = !!onDelete && !event.isBirthday;

  return (
    <div className="flex items-start gap-3 py-2.5 group">
      <div className={`w-14 shrink-0 text-xs tabular ${accent} pt-0.5`}>{event.isBirthday ? '🎂' : time}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{event.summary}</div>
        {event.location && <div className="text-xs text-text-muted truncate">📍 {event.location}</div>}
      </div>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(event);
          }}
          aria-label="Delete event"
          className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-text-muted hover:text-accent-danger hover:bg-bg-elevated transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
