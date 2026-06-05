import type { ExpensePacePrimary } from '../types';
import { DeltaChip } from './DeltaChip';
import { formatAmount } from './ExpenseRow';

type Props = { readonly pace: ExpensePacePrimary };

export function PaceCard({ pace }: Props) {
  const {
    currency,
    currentTotal,
    projectedTotal,
    throughDayOfMonth,
    daysInMonth,
    comparableHistoricToDate,
    historicAvgMonthlyTotal,
    percentVsHistoric,
    baselineMonthCount,
    isCurrentMonth,
  } = pace;

  const headline = isCurrentMonth ? 'Month so far' : 'Month total';
  const monthProgressPct = (throughDayOfMonth / daysInMonth) * 100;

  // Progress bar shows actual vs historic monthly avg (when available), else vs projection, else just current.
  const barRef =
    historicAvgMonthlyTotal && historicAvgMonthlyTotal > 0
      ? historicAvgMonthlyTotal
      : projectedTotal && projectedTotal > 0
        ? projectedTotal
        : Math.max(currentTotal, 1);
  const actualPct = Math.min(100, (currentTotal / barRef) * 100);
  // For current month, mark where today sits along the bar relative to the same reference.
  const expectedAtToday = historicAvgMonthlyTotal && isCurrentMonth ? historicAvgMonthlyTotal * (throughDayOfMonth / daysInMonth) : null;
  const expectedTickPct = expectedAtToday ? Math.min(100, (expectedAtToday / barRef) * 100) : null;

  const showDelta = percentVsHistoric !== null && comparableHistoricToDate !== null;

  return (
    <section className="rounded-2xl bg-bg-card border border-border-subtle p-5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-text-muted">{headline}</div>
        {showDelta ? (
          <div className="flex items-center gap-2">
            <DeltaChip percent={percentVsHistoric!} />
            <span className="text-[11px] text-text-muted">vs typical</span>
          </div>
        ) : baselineMonthCount === 0 ? (
          <span className="text-[11px] text-text-muted">no history yet</span>
        ) : null}
      </div>

      <div className="text-3xl font-bold tabular text-text-primary">{formatAmount(currentTotal, currency)}</div>

      <div className="text-xs text-text-secondary">
        {isCurrentMonth ? (
          <>
            Day {throughDayOfMonth} of {daysInMonth} ·{' '}
            {comparableHistoricToDate !== null ? (
              <>
                Usually {formatAmount(comparableHistoricToDate, currency)} by now
              </>
            ) : (
              'Building your baseline'
            )}
          </>
        ) : (
          <>
            {daysInMonth} days ·{' '}
            {historicAvgMonthlyTotal !== null ? (
              <>vs {formatAmount(historicAvgMonthlyTotal, currency)} average</>
            ) : (
              'No historic comparison'
            )}
          </>
        )}
      </div>

      <div className="relative h-2 rounded-full bg-bg-elevated overflow-hidden mt-1">
        <div
          className="absolute inset-y-0 left-0 bg-accent-primary"
          style={{ width: `${actualPct}%`, transition: 'width 200ms' }}
        />
        {expectedTickPct !== null && (
          <div
            className="absolute inset-y-0 w-px bg-text-secondary opacity-60"
            style={{ left: `calc(${expectedTickPct}% - 0.5px)` }}
            aria-label="Where today's spend usually sits"
          />
        )}
      </div>

      {isCurrentMonth && projectedTotal !== null && historicAvgMonthlyTotal !== null && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted">Tracking toward </span>
          <span className="font-medium text-text-primary tabular">{formatAmount(projectedTotal, currency)}</span>
          <span className="text-text-muted"> · month {Math.round(monthProgressPct)}% done</span>
        </div>
      )}
    </section>
  );
}
