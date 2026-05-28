import type { ExpenseDto } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔',
  groceries: '🛒',
  transport: '🚗',
  subscriptions: '📅',
  utilities: '💡',
  shopping: '🛍️',
  entertainment: '🎬',
  health: '💊',
  bills: '🧾',
  other: '💳',
};

const CURRENCY_SYMBOL: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function ExpenseRow({ expense }: { readonly expense: ExpenseDto }) {
  const emoji = CATEGORY_EMOJI[expense.category] || '💳';
  const typeTag = expense.type === 'card_alert' ? ' · card' : expense.type === 'bill' ? ' · bill' : '';

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="text-xl shrink-0 w-7 text-center">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{expense.vendor}</div>
        <div className="text-xs text-text-muted truncate">
          {expense.category}
          {typeTag}
        </div>
      </div>
      <div className="text-sm font-medium tabular text-text-primary shrink-0">{formatAmount(expense.amount, expense.currency)}</div>
    </div>
  );
}
