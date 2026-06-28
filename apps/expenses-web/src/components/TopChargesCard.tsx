import { VendorIcon } from './VendorIcon';
import { formatExpenseDayLabel } from '../lib/date';
import type { ExpenseChargeDto } from '../types';
import { formatAmount } from './ExpenseRow';

type Props = {
  readonly rows: ReadonlyArray<ExpenseChargeDto>;
  readonly onTap?: (chargeId: string) => void;
};

export function TopChargesCard({ rows, onTap }: Props) {
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
        <div className="text-xs uppercase tracking-wide text-text-muted mb-2">Top charges</div>
        <div className="text-sm text-text-muted py-2">No charges this month</div>
      </section>
    );
  }
  return (
    <section className="rounded-2xl bg-bg-card border border-border-subtle p-4 flex flex-col gap-3">
      <div className="text-xs uppercase tracking-wide text-text-muted">Top charges</div>
      <div className="flex flex-col divide-y divide-border-subtle">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => onTap?.(r.id)}
            className="flex items-center gap-3 py-2.5 text-left active:bg-bg-elevated rounded-md px-1 -mx-1 transition-colors"
          >
            <VendorIcon vendor={r.vendor} className="w-9 h-9 rounded-full" textClassName="text-xs" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary truncate">{r.vendor}</div>
              <div className="text-[11px] text-text-muted">
                {formatExpenseDayLabel(r.transactionDate)}
                {r.card ? ` · •••${r.card}` : ''}
              </div>
            </div>
            <div className="text-sm font-semibold tabular text-text-primary shrink-0">
              {formatAmount(r.amount, r.currency)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
