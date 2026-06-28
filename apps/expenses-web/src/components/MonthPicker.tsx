import { useState } from 'react';
import { currentYm, formatMonthLabel, shiftMonth } from '../lib/date';
import { MonthPickerSheet } from './MonthPickerSheet';

type Props = {
  readonly selected: string; // YYYY-MM or 'all'
  readonly onSelect: (value: string) => void;
};

export function MonthPicker({ selected, onSelect }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isAll = selected === 'all';
  const isCurrent = !isAll && selected === currentYm();
  const label = isAll ? 'All time' : formatMonthLabel(selected);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <NavButton dir="prev" onClick={() => onSelect(shiftMonth(selected, -1))} disabled={isAll} />
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Choose month"
          className="flex-1 px-4 py-2 rounded-full bg-bg-card border border-border-subtle text-text-primary font-medium text-sm flex items-center justify-center gap-2 hover:bg-bg-elevated transition-colors"
        >
          {isAll ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
          <span>{label}</span>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <NavButton dir="next" onClick={() => onSelect(shiftMonth(selected, 1))} disabled={isAll || isCurrent} />
      </div>
      {sheetOpen && (
        <MonthPickerSheet
          selected={selected}
          onSelect={onSelect}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

function NavButton({ dir, onClick, disabled }: { readonly dir: 'prev' | 'next'; readonly onClick: () => void; readonly disabled?: boolean }) {
  const points = dir === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 grid place-items-center rounded-full bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-card disabled:hover:text-text-secondary"
      aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={points} />
      </svg>
    </button>
  );
}
