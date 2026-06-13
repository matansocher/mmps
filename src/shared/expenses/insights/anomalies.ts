import type { Expense } from '../types';
import { effectiveVendor } from '../utils/analytics';

export type AnomalyOptions = {
  readonly minSamples?: number;
  readonly sigma?: number;
  readonly absoluteFloor?: number; // ignore tiny vendors where stddev is noise
};

const DEFAULTS: Required<AnomalyOptions> = {
  minSamples: 4,
  sigma: 2,
  absoluteFloor: 10,
};

export type VendorStat = {
  readonly vendor: string;
  readonly currency: string;
  readonly mean: number;
  readonly stddev: number;
  readonly samples: number;
};

function vendorStatsFromHistory(history: ReadonlyArray<Expense>): Map<string, VendorStat> {
  const buckets = new Map<string, number[]>();
  const meta = new Map<string, { vendor: string; currency: string }>();
  for (const e of history) {
    const key = `${effectiveVendor(e)}\u0000${e.currency}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      meta.set(key, { vendor: effectiveVendor(e), currency: e.currency });
    }
    buckets.get(key)!.push(e.amount);
  }

  const out = new Map<string, VendorStat>();
  for (const [key, amounts] of buckets) {
    const n = amounts.length;
    if (n < 2) continue;
    const mean = amounts.reduce((a, b) => a + b, 0) / n;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);
    const { vendor, currency } = meta.get(key)!;
    out.set(key, { vendor, currency, mean, stddev, samples: n });
  }
  return out;
}

export function computeAnomalies(
  candidates: ReadonlyArray<Expense>,
  history: ReadonlyArray<Expense>,
  opts: AnomalyOptions = {},
): Expense[] {
  const cfg = { ...DEFAULTS, ...opts };
  const stats = vendorStatsFromHistory(history);
  const flagged: Expense[] = [];
  for (const e of candidates) {
    const key = `${effectiveVendor(e)}\u0000${e.currency}`;
    const s = stats.get(key);
    if (!s || s.samples < cfg.minSamples) continue;
    if (e.amount <= cfg.absoluteFloor) continue;
    const threshold = Math.max(s.mean + cfg.sigma * s.stddev, cfg.absoluteFloor);
    if (e.amount > threshold) flagged.push(e);
  }
  return flagged;
}
