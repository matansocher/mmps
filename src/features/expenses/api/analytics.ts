import { addDays, endOfMonth, subMonths } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { effectiveCategory, effectiveVendor, type Expense } from '@shared/expenses';
import type { ExpenseCategoryDelta, ExpenseCategoryDto } from './dto';

export type Baseline = {
  readonly monthCount: number;
  readonly avgFullMonthTotal: number;
  readonly avgToDateTotal: number;
  readonly byCategoryAvg: Map<string, number>;
  readonly byCategoryMonthsPresent: Map<string, number>;
  readonly byVendorAvg: Map<string, number>;
  readonly byVendorMonthsPresent: Map<string, number>;
  readonly allVendors: Set<string>;
};

export function getMonthBoundaries(ym: string): { ym: string; start: Date; endExclusive: Date; daysInMonth: number } {
  const start = fromZonedTime(`${ym}-01T00:00:00`, DEFAULT_TIMEZONE);
  const endDay = endOfMonth(toZonedTime(start, DEFAULT_TIMEZONE));
  return {
    ym,
    start,
    endExclusive: fromZonedTime(formatInTimeZone(addDays(endDay, 1), DEFAULT_TIMEZONE, "yyyy-MM-dd'T'00:00:00"), DEFAULT_TIMEZONE),
    daysInMonth: endDay.getDate(),
  };
}

export function parseSelectedMonth(raw: unknown, now = new Date()): { ym: string; start: Date; endExclusive: Date } {
  const todayYm = formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM');
  const ym = typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw) ? raw : todayYm;
  const { start, endExclusive } = getMonthBoundaries(ym);
  return { ym, start, endExclusive };
}

export function prevYm(ym: string, monthsBack: number): string {
  const start = fromZonedTime(`${ym}-01T00:00:00`, DEFAULT_TIMEZONE);
  return formatInTimeZone(fromZonedTime(subMonths(toZonedTime(start, DEFAULT_TIMEZONE), monthsBack), DEFAULT_TIMEZONE), DEFAULT_TIMEZONE, 'yyyy-MM');
}

export function zonedDayOfMonth(date: Date): number {
  return parseInt(formatInTimeZone(date, DEFAULT_TIMEZONE, 'd'), 10);
}

export function buildBaseline(allExpenses: ReadonlyArray<Expense>, selectedYm: string, throughDayOfSelected: number, primaryCurrency: string): Baseline {
  const months = Array.from({ length: 3 }, (_, index) => getMonthBoundaries(prevYm(selectedYm, index + 1)))
    .map((boundaries) => ({
      ...boundaries,
      expenses: allExpenses.filter((expense) => expense.currency === primaryCurrency && expense.transactionDate >= boundaries.start && expense.transactionDate < boundaries.endExclusive),
    }))
    .filter((month) => month.expenses.length > 0);

  if (months.length === 0) {
    return {
      monthCount: 0,
      avgFullMonthTotal: 0,
      avgToDateTotal: 0,
      byCategoryAvg: new Map(),
      byCategoryMonthsPresent: new Map(),
      byVendorAvg: new Map(),
      byVendorMonthsPresent: new Map(),
      allVendors: new Set(),
    };
  }

  let sumFull = 0;
  let sumToDate = 0;
  const byCategoryTotals = new Map<string, number>();
  const byCategoryMonthsPresent = new Map<string, number>();
  const byVendorTotals = new Map<string, number>();
  const byVendorMonthsPresent = new Map<string, number>();
  const allVendors = new Set<string>();

  for (const month of months) {
    const seenCategories = new Set<string>();
    const seenVendors = new Set<string>();
    for (const expense of month.expenses) {
      sumFull += expense.amount;
      if (zonedDayOfMonth(expense.transactionDate) <= Math.min(throughDayOfSelected, month.daysInMonth)) sumToDate += expense.amount;
      const category = effectiveCategory(expense);
      const vendor = effectiveVendor(expense);
      byCategoryTotals.set(category, (byCategoryTotals.get(category) ?? 0) + expense.amount);
      byVendorTotals.set(vendor, (byVendorTotals.get(vendor) ?? 0) + expense.amount);
      seenCategories.add(category);
      seenVendors.add(vendor);
      allVendors.add(vendor);
    }
    for (const category of seenCategories) byCategoryMonthsPresent.set(category, (byCategoryMonthsPresent.get(category) ?? 0) + 1);
    for (const vendor of seenVendors) byVendorMonthsPresent.set(vendor, (byVendorMonthsPresent.get(vendor) ?? 0) + 1);
  }

  return {
    monthCount: months.length,
    avgFullMonthTotal: sumFull / months.length,
    avgToDateTotal: sumToDate / months.length,
    byCategoryAvg: new Map([...byCategoryTotals].map(([category, total]) => [category, total / months.length])),
    byCategoryMonthsPresent,
    byVendorAvg: new Map([...byVendorTotals].map(([vendor, total]) => [vendor, total / months.length])),
    byVendorMonthsPresent,
    allVendors,
  };
}

export function enrichCategoryDeltas(expenses: ReadonlyArray<Expense>, baseline: Baseline | null, primaryCurrency: string): ExpenseCategoryDelta[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const expense of expenses) {
    const category = effectiveCategory(expense);
    const current = totals.get(category) ?? { total: 0, count: 0 };
    totals.set(category, { total: current.total + expense.amount, count: current.count + 1 });
  }
  return [...totals.entries()]
    .map(([category, { total, count }]) => {
      const historicAverage = baseline?.byCategoryAvg.get(category) ?? null;
      const monthsPresent = baseline?.byCategoryMonthsPresent.get(category) ?? 0;
      const isComparable = !!baseline && baseline.monthCount >= 2 && monthsPresent >= 2 && historicAverage !== null && historicAverage > 0;
      return {
        category: category as ExpenseCategoryDto,
        currency: primaryCurrency,
        currentTotal: Math.round(total * 100) / 100,
        currentCount: count,
        comparableHistoricAvg: historicAverage !== null ? Math.round(historicAverage * 100) / 100 : null,
        percentVsHistoric: isComparable ? Math.round(((total - historicAverage) / historicAverage) * 100) : null,
      };
    })
    .sort((a, b) => b.currentTotal - a.currentTotal);
}
