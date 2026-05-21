import { useState } from 'react';
import { dateStringFromOffset } from '../lib/format';
import { CalendarSheet } from './CalendarSheet';

type Preset = { label: string; offset: number };

const PRESETS: Preset[] = [
  { label: 'היום', offset: 0 },
  { label: 'מחר', offset: 1 },
  { label: 'אתמול', offset: -1 },
];

function formatPickedLabel(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

const PILL_BASE = 'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border';
const PILL_ACTIVE = 'bg-accent-win text-bg-base border-accent-win';
const PILL_IDLE = 'bg-bg-card text-text-secondary border-border-subtle hover:text-text-primary';

type Props = {
  selected: string;
  onSelect: (date: string) => void;
};

export function DayPicker({ selected, onSelect }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const presetDates = PRESETS.map((p) => dateStringFromOffset(p.offset));
  const customActive = !presetDates.includes(selected);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto px-1 -mx-1 pb-1 scrollbar-none">
        {PRESETS.map((p) => {
          const date = dateStringFromOffset(p.offset);
          const active = date === selected;
          return (
            <button
              key={p.offset}
              onClick={() => onSelect(date)}
              className={`${PILL_BASE} ${active ? PILL_ACTIVE : PILL_IDLE}`}
            >
              {p.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={`${PILL_BASE} flex items-center gap-1.5 ${customActive ? PILL_ACTIVE : PILL_IDLE}`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{customActive ? formatPickedLabel(selected) : 'תאריך'}</span>
        </button>
      </div>

      <CalendarSheet
        open={pickerOpen}
        selected={selected}
        onSelect={onSelect}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
