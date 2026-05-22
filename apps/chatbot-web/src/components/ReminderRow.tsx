import { formatTime } from '../lib/date';
import type { ReminderDto } from '../types';

type Props = {
  readonly reminder: ReminderDto;
  readonly onToggleComplete?: (id: string) => void;
  readonly onTap?: (reminder: ReminderDto) => void;
};

export function ReminderRow({ reminder, onToggleComplete, onTap }: Props) {
  const done = reminder.status === 'completed';

  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.(reminder.id);
        }}
        className={`shrink-0 w-5 h-5 rounded-full border-2 grid place-items-center transition-colors ${
          done ? 'bg-accent-success border-accent-success' : 'border-text-muted hover:border-text-secondary'
        }`}
        aria-label={done ? 'Mark as pending' : 'Mark as completed'}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L5 9.5L10 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <button
        onClick={() => onTap?.(reminder)}
        className="flex-1 min-w-0 text-left"
      >
        <div className={`text-sm truncate ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
          {reminder.message}
        </div>
        <div className="text-xs text-text-muted tabular">
          {reminder.status === 'snoozed' ? '⏸️ snoozed · ' : '🔔 '}{formatTime(reminder.dueDate)}
        </div>
      </button>
    </div>
  );
}
