import { useEffect, useState } from 'react';
import { ExpenseRow, formatAmount } from './ExpenseRow';
import { MonthlyBars } from './MonthlyBars';
import { Skeleton } from './Skeleton';
import { api } from '../lib/api';
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../lib/categories';
import { formatExpenseDayLabel } from '../lib/date';
import type { ExpenseCategory, ExpenseCategoryDetailResponse, ExpenseDto } from '../types';

type Props = {
  readonly category: ExpenseCategory;
  readonly onClose: () => void;
  readonly onTapExpense: (expense: ExpenseDto) => void;
  readonly onTapVendor?: (vendor: string) => void;
};

const PAGE_SIZE = 20;

export function CategoryDetailSheet({ category, onClose, onTapExpense, onTapVendor }: Props) {
  const [data, setData] = useState<ExpenseCategoryDetailResponse | null>(null);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    api
      .expenseCategory(category)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const emoji = CATEGORY_EMOJI[category];
  const label = CATEGORY_LABELS[category];
  const visible = data?.expenses.slice(0, visibleCount) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span>{label}</span>
            <span className="text-xs font-normal text-text-muted">· all time</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!data && !error && <DetailSkeleton />}
          {error && <div className="px-5 py-10 text-center text-sm text-accent-danger">Failed to load</div>}
          {data && data.expenses.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-text-muted">No expenses in this category</div>
          )}
          {data && data.expenses.length > 0 && (
            <>
              <SummaryHeader
                total={data.total}
                count={data.count}
                avg={data.avg}
                currency={data.currency}
                firstDate={data.firstDate}
                lastDate={data.lastDate}
                extraTotals={data.totals.filter((t) => t.currency !== data.currency)}
              />

              {data.monthlyTotals.length > 0 && data.monthlyTotals.some((m) => m.total > 0) && (
                <div className="px-5 pb-5">
                  <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">Last 12 months</div>
                  <MonthlyBars points={data.monthlyTotals} currency={data.currency} />
                </div>
              )}

              {data.topVendors.length > 0 && (
                <div className="px-5 pb-5">
                  <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">Top vendors</div>
                  <div className="flex flex-col gap-1">
                    {data.topVendors.map((v) => (
                      <button
                        key={v.vendor}
                        onClick={() => onTapVendor?.(v.vendor)}
                        disabled={!onTapVendor}
                        className="flex items-center justify-between gap-3 py-1.5 text-left disabled:cursor-default"
                      >
                        <div className="flex-1 min-w-0 text-sm text-text-primary truncate">{v.vendor}</div>
                        <div className="text-xs text-text-muted tabular shrink-0">{v.count}×</div>
                        <div className="text-sm font-medium text-text-primary tabular shrink-0 w-20 text-right">
                          {formatAmount(v.total, data.currency)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border-subtle">
                <div className="px-5 py-3 text-[11px] uppercase tracking-wide text-text-muted">
                  Charges · {data.expenses.length}
                </div>
                <div className="px-5 divide-y divide-border-subtle">
                  {visible.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onTap={onTapExpense}
                      dayLabel={formatExpenseDayLabel(expense.transactionDate)}
                    />
                  ))}
                </div>
                {visibleCount < data.expenses.length && (
                  <button
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="w-full py-3 text-sm text-accent-primary border-t border-border-subtle hover:bg-bg-elevated transition-colors"
                  >
                    Show more · {Math.min(PAGE_SIZE, data.expenses.length - visibleCount)}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SummaryHeader({
  total,
  count,
  avg,
  currency,
  firstDate,
  lastDate,
  extraTotals,
}: {
  readonly total: number;
  readonly count: number;
  readonly avg: number;
  readonly currency: string;
  readonly firstDate: string | null;
  readonly lastDate: string | null;
  readonly extraTotals: ReadonlyArray<{ currency: string; total: number }>;
}) {
  return (
    <div className="px-5 py-4 border-b border-border-subtle">
      <div className="text-3xl font-semibold text-text-primary tabular">{formatAmount(total, currency)}</div>
      <div className="text-xs text-text-muted mt-1">
        {count} charges · avg {formatAmount(avg, currency)}
      </div>
      {(firstDate || lastDate) && (
        <div className="text-xs text-text-muted mt-1">
          {firstDate && <>First {formatExpenseDayLabel(firstDate)}</>}
          {firstDate && lastDate && firstDate !== lastDate && <> · Last {formatExpenseDayLabel(lastDate)}</>}
        </div>
      )}
      {extraTotals.length > 0 && (
        <div className="text-[11px] text-text-muted mt-1">
          Also: {extraTotals.map((t) => formatAmount(t.total, t.currency)).join(' · ')}
        </div>
      )}
    </div>
  );
}



function DetailSkeleton() {
  return (
    <>
      <div className="px-5 py-4 border-b border-border-subtle flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="px-5 py-5">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="px-5 pb-5 flex flex-col gap-2">
        <Skeleton className="h-3 w-20 mb-1" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </>
  );
}
