import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExpenseEditSheet } from '../components/ExpenseEditSheet';
import { ExpenseLineChart } from '../components/ExpenseLineChart';
import { ExpenseRow, formatAmount } from '../components/ExpenseRow';
import { MonthPicker } from '../components/MonthPicker';
import { Skeleton } from '../components/Skeleton';
import { Toast } from '../components/Toast';
import { api } from '../lib/api';
import { currentYm, formatExpenseDayLabel, formatMonthLabel, shiftMonth } from '../lib/date';
import { haptic } from '../lib/telegram';
import type { ExpenseDto, ExpensesMonthResponse, UpdateExpenseBody } from '../types';

type ToastState = { readonly message: string; readonly kind: 'success' | 'error' | 'info' } | null;

const PAGE_SIZE = 10;

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔', groceries: '🛒', transport: '🚗', subscriptions: '📅', utilities: '💡',
  shopping: '🛍️', entertainment: '🎬', health: '💊', bills: '🧾', other: '💳',
};

export function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYm());
  const [data, setData] = useState<ExpensesMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<ExpenseDto | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const touchStartX = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.expensesMonth(selectedMonth);
      setData(r);
    } catch {
      setToast({ message: 'Failed to load', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    load();
    setCategoryFilter(null);
    setVisibleCount(PAGE_SIZE);
  }, [load]);

  function changeMonth(delta: number) {
    setSelectedMonth((m) => {
      const next = shiftMonth(m, delta);
      if (delta > 0 && next > currentYm()) return m;
      return next;
    });
    haptic('select');
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    changeMonth(dx > 0 ? -1 : 1);
  }

  async function handleSaveOverride(body: UpdateExpenseBody) {
    if (!editing) return;
    const updated = await api.updateExpense(editing.id, body);
    setData((prev) =>
      prev ? { ...prev, expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e)) } : prev,
    );
    setEditing(null);
    haptic('success');
    setToast({ message: 'Updated', kind: 'success' });
  }

  const expenses = data?.expenses ?? [];
  const filtered = useMemo(
    () => (categoryFilter ? expenses.filter((e) => e.category === categoryFilter) : expenses),
    [expenses, categoryFilter],
  );
  const visible = filtered.slice(0, visibleCount);
  const monthCurrencies = data?.totals.map((t) => t.currency) ?? [];
  const primaryCurrency = monthCurrencies[0] ?? 'ILS';
  const monthTotal = data?.totals.find((t) => t.currency === primaryCurrency);
  const chartSeries = data?.daily.find((d) => d.currency === primaryCurrency) ?? data?.daily[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="flex flex-col gap-3">
        <MonthPicker selected={selectedMonth} onSelect={setSelectedMonth} />
        <div>
          <div className="text-xs text-text-muted uppercase tracking-wide">Expenses</div>
          <h1 className="text-xl font-semibold">{formatMonthLabel(selectedMonth)}</h1>
        </div>
      </header>

      {loading ? (
        <>
          <div className="rounded-2xl bg-bg-card border border-border-subtle p-5">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-3 w-28 mt-2" />
          </div>
          <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between px-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 mt-1 mx-1 rounded-full" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle">
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="px-4 divide-y divide-border-subtle">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-7 w-7 shrink-0" rounded="full" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3.5 w-14" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : data ? (
        <>
          <section className="rounded-2xl bg-bg-card border border-border-subtle p-5">
            {monthTotal ? (
              <>
                <div className="text-3xl font-bold tabular text-text-primary">
                  {formatAmount(monthTotal.total, monthTotal.currency)}
                </div>
                <div className="mt-1 text-xs text-text-secondary">
                  {expenses.length} transaction{expenses.length === 1 ? '' : 's'}
                  {data.totals.length > 1 && (
                    <>
                      {' · '}
                      {data.totals.slice(1).map((t) => formatAmount(t.total, t.currency)).join(' · ')}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-text-muted text-sm">No spend yet this month — nice 💪</div>
            )}
          </section>

          {chartSeries && chartSeries.points.length > 0 && (
            <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
              <ExpenseLineChart points={chartSeries.points} currency={chartSeries.currency} />
            </section>
          )}

          {data.byCategory.length > 0 && (
            <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
              <div className="text-xs uppercase tracking-wide text-text-muted mb-3">By category</div>
              <CategoryBars
                rows={data.byCategory.filter((c) => c.currency === primaryCurrency)}
                total={monthTotal?.total ?? 0}
                selected={categoryFilter}
                onToggle={(c) => {
                  setCategoryFilter((prev) => (prev === c ? null : c));
                  setVisibleCount(PAGE_SIZE);
                }}
              />
            </section>
          )}

          <section className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
              <span>Transactions · {filtered.length}</span>
              {categoryFilter && (
                <button
                  onClick={() => {
                    setCategoryFilter(null);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="text-accent-primary normal-case tracking-normal"
                >
                  Clear filter
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                {categoryFilter ? 'No expenses in this category' : 'No spend this month — nice 💪'}
              </div>
            ) : (
              <>
                <div className="px-4 divide-y divide-border-subtle">
                  {visible.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onTap={setEditing}
                      showTime
                      dayLabel={formatExpenseDayLabel(expense.transactionDate)}
                    />
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <button
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="w-full py-3 text-sm text-accent-primary border-t border-border-subtle hover:bg-bg-elevated transition-colors"
                  >
                    Show more · {Math.min(PAGE_SIZE, filtered.length - visibleCount)}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      ) : null}

      {editing && (
        <ExpenseEditSheet expense={editing} onClose={() => setEditing(null)} onSave={handleSaveOverride} />
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function CategoryBars({
  rows,
  total,
  selected,
  onToggle,
}: {
  readonly rows: ReadonlyArray<{ category: string; total: number; currency: string; count: number }>;
  readonly total: number;
  readonly selected: string | null;
  readonly onToggle: (c: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  return (
    <div className="space-y-2">
      {sorted.map((r) => {
        const pct = total > 0 ? Math.max(2, Math.round((r.total / total) * 100)) : 0;
        const active = selected === r.category;
        return (
          <button
            key={r.category}
            onClick={() => onToggle(r.category)}
            className={`w-full text-left rounded-lg transition-colors ${active ? 'bg-bg-elevated' : ''}`}
          >
            <div className="flex items-center justify-between text-xs text-text-secondary px-1">
              <span className="flex items-center gap-1.5">
                <span>{CATEGORY_EMOJI[r.category] ?? '💳'}</span>
                <span className="capitalize">{r.category}</span>
                <span className="text-text-muted">· {r.count}</span>
              </span>
              <span className="tabular">{formatAmount(r.total, r.currency)}</span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full mt-1 mx-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${active ? 'bg-accent-primary' : 'bg-text-muted'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
