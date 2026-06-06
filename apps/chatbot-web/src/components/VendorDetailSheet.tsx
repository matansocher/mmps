import { useEffect, useState } from 'react';
import { SummaryHeader } from './CategoryDetailSheet';
import { Dropdown, type DropdownOption } from './Dropdown';
import { ExpenseRow } from './ExpenseRow';
import { MonthlyBars } from './MonthlyBars';
import { Skeleton } from './Skeleton';
import { api } from '../lib/api';
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../lib/categories';
import { formatExpenseDayLabel } from '../lib/date';
import { haptic } from '../lib/telegram';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseDto, type ExpenseVendorDetailResponse } from '../types';

type Props = {
  readonly vendor: string;
  readonly onClose: () => void;
  readonly onTapExpense: (expense: ExpenseDto) => void;
};

const PAGE_SIZE = 20;

const CATEGORY_OPTIONS: ReadonlyArray<DropdownOption<ExpenseCategory>> = EXPENSE_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
  emoji: CATEGORY_EMOJI[value],
}));

export function VendorDetailSheet({ vendor, onClose, onTapExpense }: Props) {
  const [currentName, setCurrentName] = useState(vendor);
  const [data, setData] = useState<ExpenseVendorDetailResponse | null>(null);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(vendor);
  const [editCategory, setEditCategory] = useState<ExpenseCategory | ''>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .expenseVendor(currentName)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setEditName(r.vendor);
        setEditCategory(r.dominantCategory?.category ?? '');
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !editing && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, editing]);

  const visible = data?.expenses.slice(0, visibleCount) ?? [];

  async function handleSaveBulk() {
    if (!data) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setSaveError('Vendor name is required');
      return;
    }
    const nameChanged = trimmed !== data.vendor;
    const categoryChanged = editCategory !== '' && editCategory !== data.dominantCategory?.category;
    if (!nameChanged && !categoryChanged) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await api.bulkUpdateVendor({
        name: data.vendor,
        ...(nameChanged ? { userVendor: trimmed } : {}),
        ...(categoryChanged ? { userCategory: editCategory as ExpenseCategory } : {}),
      });
      haptic('success');
      setData(result.vendor);
      setCurrentName(result.vendor.vendor);
      setEditCategory(result.vendor.dominantCategory?.category ?? '');
      setEditName(result.vendor.vendor);
      setEditing(false);
    } catch {
      setSaveError('Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle gap-2">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2 min-w-0 flex-1">
            <span className="truncate">{data?.vendor ?? currentName}</span>
            <span className="text-xs font-normal text-text-muted shrink-0">· all time</span>
          </h2>
          {data && !editing && (
            <button
              onClick={() => {
                setEditName(data.vendor);
                setEditCategory(data.dominantCategory?.category ?? '');
                setSaveError(null);
                setEditing(true);
              }}
              aria-label="Edit vendor"
              className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-base shrink-0"
            >
              ✎
            </button>
          )}
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg shrink-0">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!data && !error && <VendorSkeleton />}
          {error && <div className="px-5 py-10 text-center text-sm text-accent-danger">Failed to load</div>}
          {data && !error && data.expenses.length === 0 && !editing && (
            <div className="px-5 py-10 text-center text-sm text-text-muted">No charges to this vendor</div>
          )}
          {data && editing && (
            <div className="px-5 py-4 border-b border-border-subtle space-y-4 bg-bg-elevated/50">
              <div className="text-[11px] uppercase tracking-wide text-text-muted">
                Edit · applies to all {data.count} {data.count === 1 ? 'charge' : 'charges'}
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Vendor name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-bg-card border border-border-subtle px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Category</label>
                <Dropdown<ExpenseCategory>
                  value={(editCategory || CATEGORY_OPTIONS[0].value) as ExpenseCategory}
                  options={CATEGORY_OPTIONS}
                  onChange={setEditCategory}
                  className="mt-1.5"
                />
              </div>
              {saveError && <div className="text-xs text-accent-danger">{saveError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary bg-bg-card border border-border-subtle"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBulk}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-accent-primary text-bg-base disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save all'}
                </button>
              </div>
            </div>
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

              {data.dominantCategory && (
                <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2 text-xs text-text-muted">
                  <span>Mostly</span>
                  <span className="inline-flex items-center gap-1 text-text-secondary">
                    <span>{CATEGORY_EMOJI[data.dominantCategory.category]}</span>
                    <span>{CATEGORY_LABELS[data.dominantCategory.category]}</span>
                  </span>
                  <span>· {Math.round(data.dominantCategory.share * 100)}%</span>
                </div>
              )}

              {data.monthlyTotals.length > 0 && data.monthlyTotals.some((m) => m.total > 0) && (
                <div className="px-5 py-4">
                  <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">Last 12 months</div>
                  <MonthlyBars points={data.monthlyTotals} currency={data.currency} height={84} />
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

function VendorSkeleton() {
  return (
    <>
      <div className="px-5 py-4 border-b border-border-subtle flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="px-5 py-4">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="px-5 pb-5 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </>
  );
}
