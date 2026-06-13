import { useEffect, useState } from 'react';
import { Skeleton } from './Skeleton';
import { formatAmount } from './ExpenseRow';
import { api } from '../lib/api';
import { getCategoryEmoji } from '../lib/categories';
import { formatExpenseDayLabel } from '../lib/date';
import type { SubscriptionDto } from '../types';

type Props = {
  readonly onOpen: (subs: ReadonlyArray<SubscriptionDto>) => void;
};

export function SubscriptionsTile({ onOpen }: Props) {
  const [subs, setSubs] = useState<ReadonlyArray<SubscriptionDto> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .subscriptions()
      .then((r) => {
        if (!cancelled) setSubs(r);
      })
      .catch(() => {
        if (!cancelled) setSubs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (subs === null) {
    return (
      <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-9 w-full" />
      </section>
    );
  }
  if (subs.length === 0) return null;

  const totals = new Map<string, number>();
  for (const s of subs) totals.set(s.currency, (totals.get(s.currency) ?? 0) + s.monthlyEquivalent);
  const totalsLine = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([currency, total]) => formatAmount(total, currency))
    .join(' · ');

  const preview = subs.slice(0, 3);
  return (
    <button
      onClick={() => onOpen(subs)}
      className="rounded-2xl bg-bg-card border border-border-subtle p-4 text-left active:bg-bg-elevated transition-colors flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-text-muted">Subscriptions</div>
        <div className="text-[11px] text-text-muted">{subs.length} active</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold tabular text-text-primary">{totalsLine}</div>
        <div className="text-[11px] text-text-muted">/month</div>
      </div>
      <div className="flex flex-col gap-1">
        {preview.map((s) => (
          <div key={`${s.vendor}|${s.currency}`} className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-sm">{getCategoryEmoji(s.category)}</span>
            <span className="text-text-primary truncate flex-1 min-w-0">{s.vendor}</span>
            <span className="tabular">{formatAmount(s.avgAmount, s.currency)}</span>
          </div>
        ))}
        {subs.length > preview.length && (
          <div className="text-[11px] text-accent-primary mt-1">View all {subs.length} →</div>
        )}
      </div>
    </button>
  );
}

type SheetProps = {
  readonly subscriptions: ReadonlyArray<SubscriptionDto>;
  readonly onClose: () => void;
  readonly onTapVendor: (vendor: string) => void;
};

export function SubscriptionsSheet({ subscriptions, onClose, onTapVendor }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totals = new Map<string, number>();
  for (const s of subscriptions) totals.set(s.currency, (totals.get(s.currency) ?? 0) + s.monthlyEquivalent);
  const totalsLine = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([currency, total]) => formatAmount(total, currency))
    .join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl max-h-[92vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            Subscriptions
            <span className="ml-2 text-xs font-normal text-text-muted">· {totalsLine}/mo</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 divide-y divide-border-subtle">
          {subscriptions.map((s) => (
            <button
              key={`${s.vendor}|${s.currency}`}
              onClick={() => onTapVendor(s.vendor)}
              className="flex items-center gap-3 py-3 w-full text-left active:bg-bg-elevated rounded-md -mx-1 px-1 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-bg-elevated grid place-items-center text-base shrink-0">
                {getCategoryEmoji(s.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">{s.vendor}</div>
                <div className="text-[11px] text-text-muted">
                  every {s.cadenceDays}d · {s.occurrences}× since {formatExpenseDayLabel(s.firstChargedAt)}
                </div>
                <div className="text-[11px] text-text-muted">
                  next ≈ {formatExpenseDayLabel(s.nextExpectedAt)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold tabular text-text-primary">{formatAmount(s.avgAmount, s.currency)}</div>
                <div className="text-[11px] text-text-muted tabular">{formatAmount(s.monthlyEquivalent, s.currency)}/mo</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
