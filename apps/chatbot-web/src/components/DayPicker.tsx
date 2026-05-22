import { useState } from 'react';
import { CalendarSheet } from './CalendarSheet';
import { dateFromYmd, isToday, isTomorrow, isYesterday, shiftDays } from '../lib/date';

type Props = {
  readonly selected: string;
  readonly onSelect: (date: string) => void;
};

function formatLabel(value: string): string {
  if (isToday(value)) return 'Today';
  if (isTomorrow(value)) return 'Tomorrow';
  if (isYesterday(value)) return 'Yesterday';
  return dateFromYmd(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DayPicker({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <NavButton dir="prev" onClick={() => onSelect(shiftDays(selected, -1))} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 px-4 py-2 rounded-full bg-bg-card border border-border-subtle text-text-primary font-medium text-sm flex items-center justify-center gap-2 hover:bg-bg-elevated transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{formatLabel(selected)}</span>
        </button>
        <NavButton dir="next" onClick={() => onSelect(shiftDays(selected, 1))} />
      </div>

      <CalendarSheet open={open} selected={selected} onSelect={onSelect} onClose={() => setOpen(false)} />
    </>
  );
}

function NavButton({ dir, onClick }: { readonly dir: 'prev' | 'next'; readonly onClick: () => void }) {
  const points = dir === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6';
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 grid place-items-center rounded-full bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
      aria-label={dir === 'prev' ? 'Previous day' : 'Next day'}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={points} />
      </svg>
    </button>
  );
}
