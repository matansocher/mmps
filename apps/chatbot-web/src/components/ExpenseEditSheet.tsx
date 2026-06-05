import { useEffect, useState } from 'react';
import { formatAmount } from './ExpenseRow';
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../lib/categories';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseDto, type ExpenseType, type UpdateExpenseBody } from '../types';

const CATEGORIES: ReadonlyArray<{ value: ExpenseCategory; emoji: string; label: string }> = EXPENSE_CATEGORIES.map((value) => ({
  value,
  emoji: CATEGORY_EMOJI[value],
  label: CATEGORY_LABELS[value],
}));

const TYPES: ReadonlyArray<{ value: ExpenseType; label: string }> = [
  { value: 'receipt', label: 'Receipt' },
  { value: 'card_alert', label: 'Card' },
  { value: 'bill', label: 'Bill' },
];

type Props = {
  readonly expense: ExpenseDto;
  readonly onClose: () => void;
  readonly onSave: (body: UpdateExpenseBody) => Promise<void>;
};

export function ExpenseEditSheet({ expense, onClose, onSave }: Props) {
  const [vendor, setVendor] = useState(expense.vendor);
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [type, setType] = useState<ExpenseType>(expense.type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const originalVendor = expense.originalVendor ?? expense.vendor;
  const originalCategory = expense.originalCategory ?? expense.category;
  const originalType = expense.originalType ?? expense.type;

  const dirty = vendor.trim() !== expense.vendor || category !== expense.category || type !== expense.type;
  const hasOverrides = !!(expense.originalVendor || expense.originalCategory || expense.originalType);

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const body: { userVendor?: string | null; userCategory?: ExpenseCategory | null; userType?: ExpenseType | null } = {};
      const v = vendor.trim();
      if (v !== expense.vendor) body.userVendor = v === originalVendor ? null : v;
      if (category !== expense.category) body.userCategory = category === originalCategory ? null : category;
      if (type !== expense.type) body.userType = type === originalType ? null : type;
      await onSave(body);
    } catch {
      setError('Failed to save. Try again.');
      setSaving(false);
    }
  }

  async function handleResetAll() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ userVendor: null, userCategory: null, userType: null });
    } catch {
      setError('Failed to reset.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl max-h-[88vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">Edit expense</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {hasOverrides && (
            <div className="text-[11px] text-text-muted uppercase tracking-wide">
              AI inferred: {originalVendor} · {originalCategory} · {originalType}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Vendor</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-bg-elevated border border-border-subtle px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              placeholder="Vendor name"
            />
            {originalVendor !== vendor.trim() && originalVendor !== expense.vendor && (
              <div className="mt-1 text-xs text-text-muted">AI inferred: "{originalVendor}"</div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Category</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const sel = c.value === category;
                return (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`rounded-xl py-2 px-2 text-xs font-medium flex flex-col items-center gap-0.5 border transition-colors ${
                      sel
                        ? 'bg-accent-primary text-bg-base border-accent-primary'
                        : 'bg-bg-elevated text-text-secondary border-border-subtle hover:border-text-muted'
                    }`}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Type</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {TYPES.map((t) => {
                const sel = t.value === type;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`rounded-xl py-2.5 text-xs font-medium border transition-colors ${
                      sel
                        ? 'bg-accent-primary text-bg-base border-accent-primary'
                        : 'bg-bg-elevated text-text-secondary border-border-subtle hover:border-text-muted'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Amount</label>
            <div className="mt-1.5 rounded-xl bg-bg-elevated border border-border-subtle px-3 py-2.5 text-sm text-text-muted">
              {formatAmount(expense.amount, expense.currency)}
              <span className="ml-2 text-xs">— log a correction in chat</span>
            </div>
          </div>

          {expense.notes && (
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Notes</label>
              <div className="mt-1.5 rounded-xl bg-bg-elevated border border-border-subtle px-3 py-2.5 text-sm text-text-secondary whitespace-pre-wrap">
                {expense.notes}
              </div>
            </div>
          )}

          {error && <div className="text-xs text-accent-danger">{error}</div>}
        </div>

        <div className="px-5 py-4 border-t border-border-subtle space-y-2">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`w-full rounded-xl py-3 font-semibold text-sm transition-colors ${
              !dirty || saving ? 'bg-bg-elevated text-text-muted cursor-not-allowed' : 'bg-accent-primary text-bg-base'
            }`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {hasOverrides && (
            <button
              onClick={handleResetAll}
              disabled={saving}
              className="w-full py-2 text-xs text-text-muted hover:text-text-secondary"
            >
              Reset all overrides
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
