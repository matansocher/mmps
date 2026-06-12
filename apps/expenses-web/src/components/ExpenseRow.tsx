import { getCategoryEmoji } from '../lib/categories';
import type { ExpenseDto } from '../types';

const CURRENCY_SYMBOL: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

type Props = {
  readonly expense: ExpenseDto;
  readonly onTap?: (expense: ExpenseDto) => void;
  readonly dayLabel?: string;
};

export function ExpenseRow({ expense, onTap, dayLabel }: Props) {
  const emoji = getCategoryEmoji(expense.category);
  const edited = !!(expense.originalVendor || expense.originalCategory || expense.originalType);

  const inner = (
    <div className="flex items-center gap-3 py-2.5 w-full">
      <div className="text-xl shrink-0 w-7 text-center">{emoji}</div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm text-text-primary truncate">
          {expense.vendor}
          {edited && <span className="ml-1 text-[10px] text-text-muted" aria-label="Edited">✎</span>}
        </div>
        <div className="text-xs text-text-muted truncate">
          {dayLabel ?? ''}
          {expense.card ? `${dayLabel ? ' · ' : ''}•••${expense.card}` : ''}
        </div>
      </div>
      <div className="text-sm font-medium tabular text-text-primary shrink-0">{formatAmount(expense.amount, expense.currency)}</div>
    </div>
  );

  if (onTap) {
    return (
      <button onClick={() => onTap(expense)} className="w-full active:bg-bg-elevated transition-colors">
        {inner}
      </button>
    );
  }
  return inner;
}
