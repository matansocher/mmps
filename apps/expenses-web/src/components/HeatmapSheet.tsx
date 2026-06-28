import { useEffect, useMemo, useState } from 'react';
import { ExpenseRow, formatAmount } from './ExpenseRow';
import { formatExpenseDayLabel } from '../lib/date';
import type { ExpenseDto } from '../types';

type Props = {
  readonly month: string; // YYYY-MM
  readonly currency: string;
  readonly expenses: ReadonlyArray<ExpenseDto>;
  readonly onClose: () => void;
  readonly onTapExpense: (expense: ExpenseDto) => void;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function dayKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function HeatmapSheet({ month, currency, expenses, onClose, onTapExpense }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (selectedDay ? setSelectedDay(null) : onClose());
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, selectedDay]);

  const { cells, max, monthLabel, daysInMonth } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const monthExpenses = expenses.filter((e) => e.currency === currency);
    const totals: number[] = new Array(dim + 1).fill(0);
    const counts: number[] = new Array(dim + 1).fill(0);
    for (const e of monthExpenses) {
      const day = Number(dayKeyFromIso(e.transactionDate).slice(8, 10));
      if (day >= 1 && day <= dim) {
        totals[day] += e.amount;
        counts[day] += 1;
      }
    }
    let maxTotal = 0;
    for (let d = 1; d <= dim; d += 1) if (totals[d] > maxTotal) maxTotal = totals[d];

    const monthCells: Array<{ key: string; day: number | null; total: number; count: number; date: string }> = [];
    for (let i = 0; i < firstWeekday; i += 1) monthCells.push({ key: `pad-${i}`, day: null, total: 0, count: 0, date: '' });
    for (let d = 1; d <= dim; d += 1) {
      monthCells.push({
        key: `d-${d}`,
        day: d,
        total: Math.round(totals[d] * 100) / 100,
        count: counts[d],
        date: `${month}-${String(d).padStart(2, '0')}`,
      });
    }
    return {
      cells: monthCells,
      max: maxTotal,
      monthLabel: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      daysInMonth: dim,
    };
  }, [expenses, month, currency]);

  const dayExpenses = useMemo(() => {
    if (!selectedDay) return [];
    return expenses
      .filter((e) => dayKeyFromIso(e.transactionDate) === selectedDay)
      .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
  }, [expenses, selectedDay]);

  const dayTotal = dayExpenses.filter((e) => e.currency === currency).reduce((s, e) => s + e.amount, 0);

  function intensityClass(total: number): string {
    if (max === 0 || total === 0) return 'bg-bg-elevated text-text-muted';
    const ratio = total / max;
    if (ratio < 0.2) return 'bg-accent-primary/15 text-text-primary';
    if (ratio < 0.4) return 'bg-accent-primary/30 text-text-primary';
    if (ratio < 0.6) return 'bg-accent-primary/50 text-white';
    if (ratio < 0.8) return 'bg-accent-primary/70 text-white';
    return 'bg-accent-primary text-white';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            {monthLabel}
            <span className="ml-2 text-xs font-normal text-text-muted">heatmap</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="text-[10px] text-text-muted text-center uppercase tracking-wide">{label}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c) =>
                c.day === null ? (
                  <div key={c.key} className="aspect-square" />
                ) : (
                  <button
                    key={c.key}
                    onClick={() => c.count > 0 && setSelectedDay(c.date)}
                    disabled={c.count === 0}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 text-[10px] transition-transform active:scale-95 disabled:cursor-default ${intensityClass(c.total)} ${selectedDay === c.date ? 'ring-2 ring-accent-primary' : ''}`}
                    aria-label={`Day ${c.day}: ${c.count} charges`}
                  >
                    <span className="font-semibold leading-none">{c.day}</span>
                    {c.count > 0 && <span className="text-[9px] leading-none opacity-80">{c.count}</span>}
                  </button>
                ),
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-text-muted">
              <span>{daysInMonth} days</span>
              <div className="flex items-center gap-1">
                <span>less</span>
                <span className="w-3 h-3 rounded-sm bg-bg-elevated" />
                <span className="w-3 h-3 rounded-sm bg-accent-primary/30" />
                <span className="w-3 h-3 rounded-sm bg-accent-primary/60" />
                <span className="w-3 h-3 rounded-sm bg-accent-primary" />
                <span>more</span>
              </div>
            </div>
          </div>

          {selectedDay && (
            <div className="border-t border-border-subtle">
              <div className="px-5 pt-3 pb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">{formatExpenseDayLabel(`${selectedDay}T12:00:00`)}</div>
                  <div className="text-[11px] text-text-muted">{dayExpenses.length} charges · {formatAmount(dayTotal, currency)}</div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[11px] text-accent-primary"
                >
                  Clear
                </button>
              </div>
              <div className="px-5 divide-y divide-border-subtle">
                {dayExpenses.map((e) => (
                  <ExpenseRow key={e.id} expense={e} onTap={onTapExpense} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
