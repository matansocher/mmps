import { format } from 'date-fns';
import { effectiveVendor, type Expense } from '@shared/expenses';
import { type CategoryTotal, totalsByCategory } from './totals-by-category';
import { type CurrencyTotal, totalsByCurrency } from './totals-by-currency';
import { type VendorTotal, totalsByVendor } from './totals-by-vendor';

export type WeeklyDigestNumbers = {
  readonly week: { from: string; to: string };
  readonly thisWeek: {
    count: number;
    totals: CurrencyTotal[];
    topCategories: CategoryTotal[];
    topVendors: VendorTotal[];
    newVendors: string[];
  };
  readonly last30DaysAvgPerWeek: ReadonlyArray<{ currency: string; avg: number }>;
  readonly sameWeekLastYear: { count: number; totals: CurrencyTotal[] };
};

export type BuildWeeklyDigestInput = {
  readonly weekStart: Date;
  readonly weekEnd: Date;
  readonly thisWeek: ReadonlyArray<Expense>;
  readonly last30: ReadonlyArray<Expense>;
  readonly sameWeekLastYear: ReadonlyArray<Expense>;
  readonly allHistorical: ReadonlyArray<Expense>;
};

export function buildWeeklyDigestNumbers({ weekStart, weekEnd, thisWeek, last30, sameWeekLastYear, allHistorical }: BuildWeeklyDigestInput): WeeklyDigestNumbers {
  const priorVendors = new Set<string>();
  for (const e of allHistorical) {
    if (e.transactionDate < weekStart) priorVendors.add(effectiveVendor(e));
  }
  const newVendors = Array.from(new Set(thisWeek.map(effectiveVendor))).filter((v) => !priorVendors.has(v));

  const last30Totals = totalsByCurrency(last30);

  return {
    week: { from: format(weekStart, 'yyyy-MM-dd'), to: format(weekEnd, 'yyyy-MM-dd') },
    thisWeek: {
      count: thisWeek.length,
      totals: totalsByCurrency(thisWeek),
      topCategories: totalsByCategory(thisWeek, 5),
      topVendors: totalsByVendor(thisWeek, 5),
      newVendors: newVendors.slice(0, 10),
    },
    last30DaysAvgPerWeek: last30Totals.map((t) => ({ currency: t.currency, avg: Math.round((t.total / 30) * 7 * 100) / 100 })),
    sameWeekLastYear: { count: sameWeekLastYear.length, totals: totalsByCurrency(sameWeekLastYear) },
  };
}
