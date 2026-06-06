import { formatAmount } from './ExpenseRow';

type Props = {
  readonly points: ReadonlyArray<{ month: string; total: number }>;
  readonly currency: string;
  readonly height?: number;
};

function formatAxisAmount(amount: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `${symbol}${Math.round(amount)}`;
}

export function MonthlyBars({ points, currency, height = 96 }: Props) {
  const max = Math.max(...points.map((p) => p.total), 1);
  // Round max up to nice tick value for the axis label.
  const niceMax = niceCeil(max);
  const mid = niceMax / 2;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between text-[9px] text-text-muted w-8 text-right pb-3.5" style={{ height: `${height}px` }}>
        <div>{formatAxisAmount(niceMax, currency)}</div>
        <div>{formatAxisAmount(mid, currency)}</div>
        <div>0</div>
      </div>
      <div className="flex-1 flex items-end gap-1" style={{ height: `${height}px` }}>
        {points.map((p) => {
          const h = Math.max(2, (p.total / niceMax) * (height - 14));
          const monthShort = new Date(p.month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short' })[0];
          return (
            <div
              key={p.month}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${p.month}: ${formatAmount(p.total, currency)}`}
            >
              <div className="w-full bg-accent-primary/70 rounded-t" style={{ height: `${h}px` }} />
              <div className="text-[9px] text-text-muted leading-none">{monthShort}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const frac = n / exp;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * exp;
}
