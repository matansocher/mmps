import { addMonths, endOfDay, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { getExpensesBetween } from '../mongo';
import type { Expense, ExpenseCategory } from '../types';

export function effectiveCategory(e: Pick<Expense, 'category' | 'userCategory'>): ExpenseCategory {
  return e.userCategory ?? e.category;
}

export type CurrencyTotal = { readonly currency: string; readonly total: number };
export type CategoryTotal = { readonly category: ExpenseCategory; readonly currency: string; readonly total: number; readonly count: number };
export type VendorTotal = { readonly vendor: string; readonly currency: string; readonly total: number; readonly count: number };
export type MoMDelta = { readonly currency: string; readonly current: number; readonly previous: number; readonly deltaPct: number | null };

function totalsByCurrency(expenses: ReadonlyArray<Expense>): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.currency, (map.get(e.currency) ?? 0) + e.amount);
  return Array.from(map.entries())
    .map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

function totalsByCategory(expenses: ReadonlyArray<Expense>, limit?: number): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const cat = effectiveCategory(e);
    const key = `${cat}|${e.currency}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, total: existing.total + e.amount, count: existing.count + 1 });
    } else {
      map.set(key, { category: cat, currency: e.currency, total: e.amount, count: 1 });
    }
  }
  const arr = Array.from(map.values())
    .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
  return limit ? arr.slice(0, limit) : arr;
}

function totalsByVendor(expenses: ReadonlyArray<Expense>, limit?: number): VendorTotal[] {
  const map = new Map<string, VendorTotal>();
  for (const e of expenses) {
    const key = `${e.vendor}|${e.currency}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, total: existing.total + e.amount, count: existing.count + 1 });
    } else {
      map.set(key, { vendor: e.vendor, currency: e.currency, total: e.amount, count: 1 });
    }
  }
  const arr = Array.from(map.values())
    .map((v) => ({ ...v, total: Math.round(v.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
  return limit ? arr.slice(0, limit) : arr;
}

function monthRange(anchor: Date, offsetMonths = 0): { from: Date; to: Date; label: string } {
  const zoned = toZonedTime(anchor, DEFAULT_TIMEZONE);
  const target = addMonths(zoned, offsetMonths);
  const from = startOfMonth(target);
  const to = endOfDay(endOfMonth(target));
  return { from, to, label: format(target, 'MMM yyyy') };
}

function computeMoM(current: CurrencyTotal[], previous: CurrencyTotal[]): MoMDelta[] {
  const prevMap = new Map(previous.map((p) => [p.currency, p.total]));
  const seen = new Set<string>();
  const out: MoMDelta[] = [];
  for (const c of current) {
    const prev = prevMap.get(c.currency) ?? 0;
    const delta = prev === 0 ? null : Math.round(((c.total - prev) / prev) * 1000) / 10;
    out.push({ currency: c.currency, current: c.total, previous: prev, deltaPct: delta });
    seen.add(c.currency);
  }
  for (const p of previous) {
    if (seen.has(p.currency)) continue;
    out.push({ currency: p.currency, current: 0, previous: p.total, deltaPct: -100 });
  }
  return out;
}

export type MonthlyAnalytics = {
  readonly month: string; // "MMM yyyy"
  readonly totals: ReadonlyArray<CurrencyTotal>;
  readonly previousTotals: ReadonlyArray<CurrencyTotal>;
  readonly topCategories: ReadonlyArray<CategoryTotal>;
  readonly topVendors: ReadonlyArray<VendorTotal>;
  readonly monthOverMonth: ReadonlyArray<MoMDelta>;
  readonly count: number;
};

export async function buildMonthlyAnalytics(anchor: Date = new Date(), opts: { topN?: number } = {}): Promise<MonthlyAnalytics> {
  const topN = opts.topN ?? 5;
  const curr = monthRange(anchor, 0);
  const prev = monthRange(anchor, -1);

  const [currentExpenses, previousExpenses] = await Promise.all([getExpensesBetween(curr.from, curr.to), getExpensesBetween(prev.from, prev.to)]);

  const currentTotals = totalsByCurrency(currentExpenses);
  const previousTotals = totalsByCurrency(previousExpenses);
  return {
    month: curr.label,
    totals: currentTotals,
    previousTotals,
    topCategories: totalsByCategory(currentExpenses, topN),
    topVendors: totalsByVendor(currentExpenses, topN),
    monthOverMonth: computeMoM(currentTotals, previousTotals),
    count: currentExpenses.length,
  };
}

export type VendorMonthTrend = { readonly month: string; readonly total: number; readonly count: number };
export type VendorTrend = { readonly vendor: string; readonly currency: string; readonly totalAllMonths: number; readonly months: ReadonlyArray<VendorMonthTrend> };

export async function buildVendorTrends(anchor: Date = new Date(), monthsBack = 6, topVendors = 5): Promise<VendorTrend[]> {
  const months = Array.from({ length: monthsBack }, (_, i) => monthRange(anchor, -(monthsBack - 1 - i)));
  const all = await getExpensesBetween(months[0].from, months[months.length - 1].to);

  // Determine top vendors over the whole window.
  const ranking = totalsByVendor(all, topVendors);
  const top = new Set(ranking.map((r) => `${r.vendor}|${r.currency}`));

  return ranking
    .map((r) => {
      const key = `${r.vendor}|${r.currency}`;
      const monthly: VendorMonthTrend[] = months.map((m) => {
        const slice = all.filter((e) => `${e.vendor}|${e.currency}` === key && e.transactionDate && e.transactionDate >= m.from && e.transactionDate <= m.to);
        return { month: m.label, total: Math.round(slice.reduce((s, e) => s + e.amount, 0) * 100) / 100, count: slice.length };
      });
      return { vendor: r.vendor, currency: r.currency, totalAllMonths: r.total, months: monthly };
    })
    .filter((v) => top.has(`${v.vendor}|${v.currency}`));
}

export async function buildLastNDaysAnalytics(
  days: number,
): Promise<{ from: Date; to: Date; expenses: Expense[]; totals: CurrencyTotal[]; topCategories: CategoryTotal[]; topVendors: VendorTotal[] }> {
  const to = endOfDay(toZonedTime(new Date(), DEFAULT_TIMEZONE));
  const from = subMonths(to, 0);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  const expenses = await getExpensesBetween(from, to);
  return {
    from,
    to,
    expenses,
    totals: totalsByCurrency(expenses),
    topCategories: totalsByCategory(expenses, 5),
    topVendors: totalsByVendor(expenses, 5),
  };
}

export { totalsByCurrency as analyticsTotalsByCurrency, totalsByCategory as analyticsTotalsByCategory, totalsByVendor as analyticsTotalsByVendor };
