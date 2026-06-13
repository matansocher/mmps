import { differenceInCalendarDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import type { Expense, ExpenseCategory } from '../types';
import { effectiveCategory, effectiveVendor } from '../utils/analytics';

export type Subscription = {
  readonly vendor: string;
  readonly category: ExpenseCategory;
  readonly currency: string;
  readonly amount: number;
  readonly avgAmount: number;
  readonly cadenceDays: number;
  readonly occurrences: number;
  readonly firstChargedAt: string; // YYYY-MM-DD
  readonly lastChargedAt: string; // YYYY-MM-DD
  readonly nextExpectedAt: string; // YYYY-MM-DD
};

export type DetectOptions = {
  readonly minOccurrences?: number;
  readonly minGapDays?: number;
  readonly maxGapDays?: number;
  readonly amountSpreadRatio?: number; // max/min must be ≤ this
};

const DEFAULTS: Required<DetectOptions> = {
  minOccurrences: 3,
  minGapDays: 25,
  maxGapDays: 35,
  amountSpreadRatio: 1.1, // ±5% from the median ≈ 10% spread
};

const toDay = (d: Date) => format(toZonedTime(d, DEFAULT_TIMEZONE), 'yyyy-MM-dd');

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return format(date, 'yyyy-MM-dd');
};

export function detectSubscriptions(expenses: ReadonlyArray<Expense>, opts: DetectOptions = {}): Subscription[] {
  const cfg = { ...DEFAULTS, ...opts };
  if (expenses.length < cfg.minOccurrences) return [];

  // Bucket by effective vendor + currency. Subscriptions are per-currency.
  const buckets = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = `${effectiveVendor(e)}\u0000${e.currency}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(e);
    else buckets.set(key, [e]);
  }

  const subs: Subscription[] = [];
  for (const [key, group] of buckets) {
    if (group.length < cfg.minOccurrences) continue;

    const sorted = group.slice().sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      gaps.push(differenceInCalendarDays(sorted[i].transactionDate, sorted[i - 1].transactionDate));
    }
    if (gaps.length === 0) continue;

    const goodGaps = gaps.filter((g) => g >= cfg.minGapDays && g <= cfg.maxGapDays);
    // Require at least minOccurrences - 1 good gaps and that they dominate.
    if (goodGaps.length < cfg.minOccurrences - 1) continue;
    if (goodGaps.length / gaps.length < 0.7) continue;

    const amounts = sorted.map((e) => e.amount);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    if (min <= 0) continue;
    if (max / min > cfg.amountSpreadRatio) continue;

    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const avgGap = Math.round(goodGaps.reduce((a, b) => a + b, 0) / goodGaps.length);
    const last = sorted[sorted.length - 1];
    const lastChargedAt = toDay(last.transactionDate);
    const [vendor] = key.split('\u0000');

    subs.push({
      vendor,
      category: effectiveCategory(last),
      currency: last.currency,
      amount: Math.round(last.amount * 100) / 100,
      avgAmount: Math.round(avgAmount * 100) / 100,
      cadenceDays: avgGap,
      occurrences: sorted.length,
      firstChargedAt: toDay(sorted[0].transactionDate),
      lastChargedAt,
      nextExpectedAt: addDays(lastChargedAt, avgGap),
    });
  }

  return subs.sort((a, b) => b.avgAmount - a.avgAmount);
}

export function monthlyEquivalent(s: Subscription): number {
  return Math.round((s.avgAmount * (30 / s.cadenceDays)) * 100) / 100;
}
