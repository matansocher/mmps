import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddExpenseSheet } from '../components/AddExpenseSheet';
import { AnomaliesSheet } from '../components/AnomaliesSheet';
import { CategoryDetailSheet } from '../components/CategoryDetailSheet';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { ExpenseEditSheet } from '../components/ExpenseEditSheet';
import { ExpenseRow, formatAmount } from '../components/ExpenseRow';
import { HeatmapSheet } from '../components/HeatmapSheet';
import { MonthPicker } from '../components/MonthPicker';
import { SearchSheet } from '../components/SearchSheet';
import { Skeleton } from '../components/Skeleton';
import { SubscriptionsSheet, SubscriptionsTile } from '../components/SubscriptionsTile';
import { Tabs } from '../components/Tabs';
import { Toast } from '../components/Toast';
import { TopChargesCard } from '../components/TopChargesCard';
import { VendorDetailSheet } from '../components/VendorDetailSheet';
import { api } from '../lib/api';
import { currentYm, dateFromYmd, formatExpenseDayLabel, formatMonthLabel, shiftMonth } from '../lib/date';
import { haptic } from '../lib/telegram';
import type { ExpenseCategory, ExpenseDto, ExpensesMonthResponse, SubscriptionDto, UpdateExpenseBody } from '../types';

type ToastState = { readonly message: string; readonly kind: 'success' | 'error' | 'info' } | null;

type TabId = 'summary' | 'transactions';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'transactions', label: 'Transactions' },
];

const PAGE_SIZE = 10;

function readTabFromHash(): TabId {
  const h = window.location.hash.replace('#', '');
  return h === 'transactions' ? 'transactions' : 'summary';
}

export function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYm());
  const [data, setData] = useState<ExpensesMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<ExpenseDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [tab, setTab] = useState<TabId>(readTabFromHash);
  const [categoryDetail, setCategoryDetail] = useState<ExpenseCategory | null>(null);
  const [vendorDetail, setVendorDetail] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [subscriptionsModal, setSubscriptionsModal] = useState<ReadonlyArray<SubscriptionDto> | null>(null);
  const [anomaliesModal, setAnomaliesModal] = useState(false);
  const [heatmapOpen, setHeatmapOpen] = useState(false);

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
    setVisibleCount(PAGE_SIZE);
  }, [load]);

  useEffect(() => {
    const onHash = () => setTab(readTabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function changeTab(next: TabId) {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  }

  async function handleSaveOverride(body: UpdateExpenseBody, propagateToVendor: boolean) {
    if (!editing) return;
    const targetVendor = editing.vendor;
    const updated = await api.updateExpense(editing.id, body);
    if (propagateToVendor && (body.userVendor !== undefined || body.userCategory !== undefined)) {
      const bulkUpdates: { userVendor?: string; userCategory?: ExpenseCategory } = {};
      if (body.userVendor !== undefined) bulkUpdates.userVendor = updated.vendor;
      if (body.userCategory !== undefined) bulkUpdates.userCategory = updated.category;
      try {
        await api.bulkUpdateVendor({ name: targetVendor, ...bulkUpdates });
        await load();
        setEditing(null);
        haptic('success');
        setToast({ message: 'Updated all charges', kind: 'success' });
        return;
      } catch {
        // fall through to single-update toast
      }
    }
    setData((prev) =>
      prev ? { ...prev, expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e)) } : prev,
    );
    setEditing(null);
    haptic('success');
    setToast({ message: 'Updated', kind: 'success' });
  }

  const expenses = data?.expenses ?? [];
  const visible = expenses.slice(0, visibleCount);
  const anomalyIds = useMemo(() => new Set(data?.anomalyExpenseIds ?? []), [data?.anomalyExpenseIds]);
  const anomalousExpenses = useMemo(() => expenses.filter((e) => anomalyIds.has(e.id)), [expenses, anomalyIds]);

  function handleChargeTap(chargeId: string) {
    const full = expenses.find((e) => e.id === chargeId);
    if (full) setEditing(full);
  }

  function handleCategoryTap(category: string) {
    haptic('select');
    setCategoryDetail(category as ExpenseCategory);
  }

  function handleViewVendor(vendor: string) {
    haptic('select');
    setEditing(null);
    setVendorDetail(vendor);
  }

  const addDefaultDate = useMemo(() => {
    const today = new Date();
    const todayYm = currentYm();
    if (selectedMonth === 'all' || selectedMonth === todayYm) return today;
    const next = dateFromYmd(`${shiftMonth(selectedMonth, 1)}-01`);
    next.setDate(next.getDate() - 1);
    return next;
  }, [selectedMonth]);

  const isAllTime = selectedMonth === 'all';
  const headerTitle = isAllTime ? 'All time' : formatMonthLabel(selectedMonth);
  const scopeMonthForCategory = isAllTime ? undefined : selectedMonth;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <MonthPicker selected={selectedMonth} onSelect={setSelectedMonth} />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Expenses</div>
            <h1 className="text-xl font-semibold">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearching(true)}
              aria-label="Search expenses"
              className="w-10 h-10 grid place-items-center rounded-full bg-bg-elevated border border-border-subtle text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-colors"
            >
              🔍
            </button>
            <button
              onClick={() => setAdding(true)}
              aria-label="Add expense"
              className="w-10 h-10 grid place-items-center rounded-full bg-accent-primary text-white text-xl leading-none shadow-sm hover:opacity-90 transition-opacity"
            >
              +
            </button>
          </div>
        </div>
        <Tabs tabs={TABS} selected={tab} onSelect={changeTab} />
      </header>

      {loading ? (
        tab === 'summary' ? <SummarySkeleton /> : <TransactionsSkeleton />
      ) : data ? (
        tab === 'summary' ? (
          <>
            {data.categoryDeltas.length > 0 && (
              <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted">By category</div>
                  {!isAllTime && expenses.length > 0 && (
                    <button
                      onClick={() => setHeatmapOpen(true)}
                      className="text-[11px] text-accent-primary hover:underline"
                      aria-label="Open heatmap"
                    >
                      📅 Heatmap
                    </button>
                  )}
                </div>
                <CategoryPieChart
                  rows={data.categoryDeltas}
                  currency={data.currency}
                  selected={null}
                  onToggle={handleCategoryTap}
                  centerLabelTop={isAllTime ? 'All time' : 'This month'}
                />
              </section>
            )}

            {data.topCharges.length > 0 && <TopChargesCard rows={data.topCharges} onTap={handleChargeTap} />}

            <SubscriptionsTile onOpen={setSubscriptionsModal} />

            {anomalousExpenses.length > 0 && (
              <button
                onClick={() => setAnomaliesModal(true)}
                className="rounded-2xl bg-bg-card border border-border-subtle p-4 text-left active:bg-bg-elevated transition-colors flex items-center gap-3"
              >
                <div className="text-2xl shrink-0">⚠️</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium">{anomalousExpenses.length} unusual charge{anomalousExpenses.length === 1 ? '' : 's'}</div>
                  <div className="text-[11px] text-text-muted">Higher than your usual for those vendors — tap to review</div>
                </div>
                <div className="text-text-muted">→</div>
              </button>
            )}

            {data.totals.length > 1 && (
              <div className="text-[11px] text-text-muted text-center">
                {isAllTime ? 'Also tracked: ' : 'Also this month: '}
                {data.totals.filter((t) => t.currency !== data.currency).map((t) => formatAmount(t.total, t.currency)).join(' · ')}
              </div>
            )}
          </>
        ) : (
          <section className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
              Transactions · {expenses.length}
            </div>
            {expenses.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                {isAllTime ? 'No expenses yet' : 'No spend this month — nice 💪'}
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
                      flagged={anomalyIds.has(expense.id)}
                    />
                  ))}
                </div>
                {visibleCount < expenses.length && (
                  <button
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="w-full py-3 text-sm text-accent-primary border-t border-border-subtle hover:bg-bg-elevated transition-colors"
                  >
                    Show more · {Math.min(PAGE_SIZE, expenses.length - visibleCount)}
                  </button>
                )}
              </>
            )}
          </section>
        )
      ) : null}

      {editing && (
        <ExpenseEditSheet
          expense={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveOverride}
          onViewVendor={handleViewVendor}
        />
      )}

      {categoryDetail && (
        <CategoryDetailSheet
          category={categoryDetail}
          month={scopeMonthForCategory}
          onClose={() => setCategoryDetail(null)}
          onTapExpense={setEditing}
          onTapVendor={handleViewVendor}
        />
      )}

      {vendorDetail && (
        <VendorDetailSheet
          vendor={vendorDetail}
          onClose={() => setVendorDetail(null)}
          onTapExpense={setEditing}
        />
      )}

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

      {searching && (
        <SearchSheet
          onClose={() => setSearching(false)}
          onTap={(e) => {
            setSearching(false);
            setEditing(e);
          }}
        />
      )}

      {subscriptionsModal && (
        <SubscriptionsSheet
          subscriptions={subscriptionsModal}
          onClose={() => setSubscriptionsModal(null)}
          onTapVendor={(vendor) => {
            setSubscriptionsModal(null);
            handleViewVendor(vendor);
          }}
        />
      )}

      {anomaliesModal && (
        <AnomaliesSheet
          expenses={anomalousExpenses}
          onClose={() => setAnomaliesModal(false)}
          onTap={(e) => {
            setAnomaliesModal(false);
            setEditing(e);
          }}
        />
      )}

      {heatmapOpen && data && (
        <HeatmapSheet
          month={selectedMonth}
          currency={data.currency}
          expenses={data.expenses}
          onClose={() => setHeatmapOpen(false)}
          onTapExpense={(e) => {
            setHeatmapOpen(false);
            setEditing(e);
          }}
        />
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <>
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
    </>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="px-4 divide-y divide-border-subtle">
        {Array.from({ length: 8 }).map((_, i) => (
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
  );
}
