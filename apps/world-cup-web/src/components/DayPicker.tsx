import { useState } from 'react';
import { CalendarSheet } from './CalendarSheet';

type Props = {
  matchDays: string[]; // e.g. ['2026-06-11', '2026-06-12', '2026-06-13']
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function DayPicker({ matchDays, selectedDate, onSelectDate }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dayLabel = (dateStr: string): string => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  const isSelectedInDays = matchDays.includes(selectedDate);

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
      {matchDays.map((day) => (
        <button
          key={day}
          onClick={() => onSelectDate(day)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedDate === day ? 'bg-accent-exact text-white' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          }`}
        >
          {dayLabel(day)}
        </button>
      ))}

      <button
        onClick={() => setCalendarOpen(true)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
          !isSelectedInDays && selectedDate ? 'bg-accent-exact text-white' : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
        }`}
        aria-label="בחר תאריך"
      >
        <CalendarIcon />
        <span>תאריך</span>
      </button>

      <CalendarSheet
        open={calendarOpen}
        selected={selectedDate}
        onSelect={onSelectDate}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4H16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1.25V2.75A.75.75 0 0 1 5.75 2ZM4 7.5v8.5h12V7.5H4Z" clipRule="evenodd" />
    </svg>
  );
}
