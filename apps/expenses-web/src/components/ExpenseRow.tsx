import { VendorIcon } from './VendorIcon';
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
  readonly flagged?: boolean;
};

export function ExpenseRow({ expense, onTap, dayLabel, flagged }: Props) {
  const edited = !!(expense.originalVendor || expense.originalCategory || expense.originalType);

  const inner = (
    <div className="flex items-center gap-3 py-2.5 w-full">
      <VendorIcon vendor={expense.vendor} className="w-7 h-7 rounded-md" textClassName="text-[10px]" />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm text-text-primary truncate">
          {expense.vendor}
          {flagged && <span className="ml-1 text-[11px]" aria-label="Unusually high" title="Unusually high for this vendor">⚠️</span>}
          {expense.notes && <span className="ml-1 text-[10px] text-text-muted" aria-label="Has notes" title={expense.notes}>📝</span>}
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
