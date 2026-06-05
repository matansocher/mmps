import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddExpenseSheet } from '../components/AddExpenseSheet';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { DailyTrajectoryChart } from '../components/DailyTrajectoryChart';
import { ExpenseEditSheet } from '../components/ExpenseEditSheet';
import { ExpenseRow, formatAmount } from '../components/ExpenseRow';
import { MonthPicker } from '../components/MonthPicker';
import { PaceCard } from '../components/PaceCard';
import { Skeleton } from '../components/Skeleton';
import { Toast } from '../components/Toast';
import { TopChargesCard } from '../components/TopChargesCard';
import { api } from '../lib/api';
import { currentYm, dateFromYmd, formatExpenseDayLabel, formatMonthLabel, shiftMonth } from '../lib/date';
import { haptic } from '../lib/telegram';
import type { ExpenseDto, ExpensesMonthResponse, UpdateExpenseBody } from '../types';

type ToastState = { readonly message: string; readonly kind: 'success' | 'error' | 'info' } | null;

const PAGE_SIZE = 10;

export function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYm());
  const [data, setData] = useState<ExpensesMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<ExpenseDto | null>(null);
  const [adding, setAdding] = useState(false);
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
  const filtered = useMemo(() => {
    if (!categoryFilter) return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);
  const visible = filtered.slice(0, visibleCount);
  const hasActiveFilter = categoryFilter !== null;

  function clearFilters() {
    setCategoryFilter(null);
    setVisibleCount(PAGE_SIZE);
  }

  function handleChargeTap(chargeId: string) {
    const full = expenses.find((e) => e.id === chargeId);
    if (full) setEditing(full);
  }

  const addDefaultDate = useMemo(() => {
    const today = new Date();
    const todayYm = currentYm();
    if (selectedMonth === todayYm) return today;
    // Past month: default to last day of that month at noon.
    const next = dateFromYmd(`${shiftMonth(selectedMonth, 1)}-01`);
    next.setDate(next.getDate() - 1);
    return next;
  }, [selectedMonth]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="flex flex-col gap-3">
        <MonthPicker selected={selectedMonth} onSelect={setSelectedMonth} />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Expenses</div>
            <h1 className="text-xl font-semibold">{formatMonthLabel(selectedMonth)}</h1>
          </div>
          <button
            onClick={() => setAdding(true)}
            aria-label="Add expense"
            className="w-10 h-10 grid place-items-center rounded-full bg-accent-primary text-white text-xl leading-none shadow-sm hover:opacity-90 transition-opacity"
          >
            +
          </button>
        </div>
      </header>

      {loading ? (
        <ExpensesPageSkeleton />
      ) : data ? (
        <>
          <PaceCard pace={data.pace} />

          {data.trajectory.length > 0 && (
            <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
              <DailyTrajectoryChart
                points={data.trajectory}
                currency={data.pace.currency}
                throughDayOfMonth={data.pace.throughDayOfMonth}
                daysInMonth={data.pace.daysInMonth}
                isCurrentMonth={data.pace.isCurrentMonth}
              />
            </section>
          )}

          {data.categoryDeltas.length > 0 && (
            <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
              <div className="text-xs uppercase tracking-wide text-text-muted mb-3">By category</div>
              <CategoryPieChart
                rows={data.categoryDeltas}
                currency={data.pace.currency}
                selected={categoryFilter}
                onToggle={(c) => {
                  setCategoryFilter((prev) => (prev === c ? null : c));
                  setVisibleCount(PAGE_SIZE);
                }}
              />
            </section>
          )}

          {data.topCharges.length > 0 && <TopChargesCard rows={data.topCharges} onTap={handleChargeTap} />}

          <section className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-text-muted">
              <div className="flex items-center gap-2 min-w-0">
                <span>Transactions · {filtered.length}</span>
                {hasActiveFilter && (
                  <span className="normal-case tracking-normal text-[11px] text-text-secondary truncate">
                    · {categoryFilter!.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {hasActiveFilter && (
                <button onClick={clearFilters} className="text-accent-primary normal-case tracking-normal shrink-0">
                  Clear
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                {hasActiveFilter ? 'Nothing matches this filter' : 'No spend this month — nice 💪'}
              </div>
            ) : (
              <>
                <div className="px-4 divide-y divide-border-subtle">
                  {visible.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onTap={setEditing}
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

          {data.totals.length > 1 && (
            <div className="text-[11px] text-text-muted text-center">
              Also this month: {data.totals.filter((t) => t.currency !== data.pace.currency).map((t) => formatAmount(t.total, t.currency)).join(' · ')}
            </div>
          )}
        </>
      ) : null}

      {editing && <ExpenseEditSheet expense={editing} onClose={() => setEditing(null)} onSave={handleSaveOverride} />}

      {adding && (
        <AddExpenseSheet
          defaultDate={addDefaultDate}
          onClose={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            haptic('success');
            setToast({ message: 'Expense added', kind: 'success' });
            await load();
          }}
          onError={() => setToast({ message: 'Failed to add', kind: 'error' })}
        />
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ExpensesPageSkeleton() {
  return (
    <>
      {/* Pace */}
      <div className="rounded-2xl bg-bg-card border border-border-subtle p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-2 w-full" />
      </div>
      {/* Trajectory */}
      <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
      {/* Category pie */}
      <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-[160px] w-[160px] shrink-0" rounded="full" />
          <div className="w-full flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5" rounded="full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Top charges */}
      <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-9 w-9 shrink-0" rounded="full" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>
      {/* Transactions */}
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
  );
}
