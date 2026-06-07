import { useEffect, useState } from 'react';
import { Dropdown, type DropdownOption } from './Dropdown';
import { api } from '../lib/api';
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../lib/categories';
import { formatDateTimeLocal } from '../lib/date';
import { EXPENSE_CATEGORIES, type CreateManualExpenseBody, type ExpenseCategory, type ExpenseDto } from '../types';

type Currency = NonNullable<CreateManualExpenseBody['currency']>;

const CURRENCY_OPTIONS: ReadonlyArray<DropdownOption<Currency>> = [
  { value: 'ILS', label: 'ILS ₪' },
  { value: 'USD', label: 'USD $' },
  { value: 'EUR', label: 'EUR €' },
  { value: 'GBP', label: 'GBP £' },
  { value: 'JPY', label: 'JPY ¥' },
];

type CategoryChoice = ExpenseCategory | 'auto';

const CATEGORY_OPTIONS: ReadonlyArray<DropdownOption<CategoryChoice>> = [
  { value: 'auto', label: 'Auto (AI)', emoji: '✨' },
  ...EXPENSE_CATEGORIES.map((c) => ({ value: c as CategoryChoice, label: CATEGORY_LABELS[c], emoji: CATEGORY_EMOJI[c] })),
];

type Props = {
  readonly defaultDate: Date;
  readonly onClose: () => void;
  readonly onSaved: (expense: ExpenseDto) => void | Promise<void>;
  readonly onError: () => void;
};

export function AddExpenseSheet({ defaultDate, onClose, onSaved, onError }: Props) {
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [category, setCategory] = useState<CategoryChoice>('auto');
  const [card, setCard] = useState<string>('');
  const [cards, setCards] = useState<ReadonlyArray<string>>([]);
  const [dateLocal, setDateLocal] = useState(() => {
    const base = new Date(defaultDate);
    base.setHours(12, 0, 0, 0);
    return formatDateTimeLocal(base);
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    api
      .listCards()
      .then((list) => {
        if (!cancelled) setCards(list);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cardOptions: ReadonlyArray<DropdownOption<string>> = [{ value: '', label: 'No card' }, ...cards.map((c) => ({ value: c, label: `•••${c}` }))];

  const parsedAmount = Number(amount);
  const isValid = vendor.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && Boolean(dateLocal);

  async function handleSave() {
    if (!isValid) return;
    try {
      setBusy(true);
      const created = await api.createManualExpense({
        vendor: vendor.trim(),
        amount: Math.round(parsedAmount * 100) / 100,
        currency,
        transactionDate: new Date(dateLocal).toISOString(),
        ...(category !== 'auto' ? { category } : {}),
        ...(card ? { card } : {}),
      });
      await onSaved(created);
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-bg-card border-t border-border-subtle rounded-t-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add expense</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Vendor</span>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Wolt, Shufersal, Paz"
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            autoFocus
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs uppercase tracking-wide text-text-muted">Amount</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            />
          </label>

          <div className="flex flex-col gap-1 w-28">
            <span className="text-xs uppercase tracking-wide text-text-muted">Currency</span>
            <Dropdown<Currency> value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Category</span>
          <Dropdown<CategoryChoice> value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Card</span>
          <Dropdown<string> value={card} options={cardOptions} onChange={setCard} />
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">When</span>
          <input
            type="datetime-local"
            value={dateLocal}
            onChange={(e) => setDateLocal(e.target.value)}
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </label>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!isValid || busy}
            className="flex-1 py-3 rounded-xl bg-accent-primary text-white font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
