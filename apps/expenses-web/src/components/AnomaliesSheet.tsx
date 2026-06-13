import { useEffect } from 'react';
import { ExpenseRow } from './ExpenseRow';
import { formatExpenseDayLabel } from '../lib/date';
import type { ExpenseDto } from '../types';

type Props = {
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly onClose: () => void;
  readonly onTap: (expense: ExpenseDto) => void;
};

export function AnomaliesSheet({ expenses, onClose, onTap }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            ⚠️ Flagged charges
            <span className="ml-2 text-xs font-normal text-text-muted">· {expenses.length}</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg">
            ✕
          </button>
        </div>
        <div className="px-5 pt-3 pb-2 text-[11px] text-text-muted">
          These charges are unusually high vs. this vendor's recent history.
        </div>
        <div className="flex-1 overflow-y-auto px-5 divide-y divide-border-subtle">
          {expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              onTap={onTap}
              dayLabel={formatExpenseDayLabel(e.transactionDate)}
              flagged
            />
          ))}
        </div>
      </div>
    </div>
  );
}
