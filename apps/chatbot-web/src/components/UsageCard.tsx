import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { UsageResponse } from '../types';
import { Skeleton } from './Skeleton';

function formatCost(cost: number): string {
  return `$${cost.toFixed(cost < 0.01 ? 4 : 2)}`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
}

type Props = {
  readonly onToast: (message: string, kind: 'success' | 'error' | 'info') => void;
};

export function UsageCard({ onToast: _onToast }: Props) {
  const [range, setRange] = useState<7 | 30>(7);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.usage(range).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setError(true);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [range]);

  const maxCost = data ? Math.max(...data.perDay.map((d) => d.cost), 0.000001) : 1;
  const totalShare = data ? data.perSource.reduce((s, r) => s + r.cost, 0) || 1 : 1;

  return (
    <section className="rounded-2xl bg-bg-card border border-border-subtle">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-text-muted">AI usage</span>
        <div className="flex gap-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                range === d ? 'bg-accent-primary text-white' : 'bg-bg-elevated text-text-muted'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-40" />
            <div className="flex items-end gap-0.5 h-12">
              {Array.from({ length: range }).map((_, i) => (
                <div key={i} className="flex-1 bg-bg-elevated rounded-sm animate-pulse" style={{ height: `${20 + (i % 5) * 10}%` }} />
              ))}
            </div>
          </>
        ) : error ? (
          <p className="text-sm text-text-muted">Failed to load usage</p>
        ) : data ? (
          <>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{formatCost(data.totals.cost)}</div>
              <div className="text-xs text-text-muted mt-0.5">
                {compact(data.totals.turns)} turns · {compact(data.totals.tokensTotal)} tokens
              </div>
            </div>

            <div className="flex items-end gap-0.5 h-12">
              {data.perDay.map((day) => (
                <div
                  key={day.day}
                  style={{ height: `${Math.max(2, (day.cost / maxCost) * 48)}px` }}
                  className="flex-1 bg-accent-primary rounded-sm cursor-default"
                  title={`${formatDayLabel(day.day)} · ${formatCost(day.cost)}`}
                />
              ))}
            </div>

            {data.perSource.length > 0 && (
              <div className="flex flex-col gap-2">
                {data.perSource.map((row) => (
                  <div key={row.source} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary capitalize">{row.source}</span>
                      <span className="text-xs text-text-muted tabular-nums">{formatCost(row.cost)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full"
                        style={{ width: `${(row.cost / totalShare) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
