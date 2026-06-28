import { useEffect, useState } from 'react';
import { currentYm } from '../lib/date';

type Props = {
  readonly selected: string; // YYYY-MM or 'all'
  readonly onSelect: (value: string) => void;
  readonly onClose: () => void;
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthPickerSheet({ selected, onSelect, onClose }: Props) {
  const todayYm = currentYm();
  const todayYear = Number(todayYm.slice(0, 4));
  const todayMonth = Number(todayYm.slice(5, 7));
  const isAll = selected === 'all';
  const initialYear = isAll ? todayYear : Number(selected.slice(0, 4));
  const [year, setYear] = useState<number>(initialYear);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function pick(monthIndex: number) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    onSelect(`${year}-${mm}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-bg-card border-t border-border-subtle rounded-t-3xl p-5 flex flex-col gap-4"
      >
        <button
          onClick={() => {
            onSelect('all');
            onClose();
          }}
          className={`w-full py-3 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
            isAll
              ? 'bg-accent-primary text-white border-accent-primary'
              : 'bg-bg-elevated text-text-secondary border-border-subtle hover:text-text-primary'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          All time
        </button>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
            className="w-9 h-9 grid place-items-center rounded-full bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary"
          >
            ‹
          </button>
          <div className="text-lg font-semibold tabular">{year}</div>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= todayYear}
            aria-label="Next year"
            className="w-9 h-9 grid place-items-center rounded-full bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS.map((label, idx) => {
            const ym = `${year}-${String(idx + 1).padStart(2, '0')}`;
            const isFuture = year > todayYear || (year === todayYear && idx + 1 > todayMonth);
            const isSelected = ym === selected;
            return (
              <button
                key={ym}
                onClick={() => pick(idx)}
                disabled={isFuture}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : isFuture
                      ? 'bg-bg-elevated/40 text-text-muted border-border-subtle/50 cursor-not-allowed'
                      : 'bg-bg-elevated text-text-secondary border-border-subtle hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
