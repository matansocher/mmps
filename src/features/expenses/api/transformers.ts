import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { DEFAULT_CURRENCY, effectiveCategory, effectiveType, effectiveVendor, type Expense, type ExpenseCategory, monthlyEquivalent, type Subscription } from '@shared/expenses';
import type {
  ExpenseCategoryBreakdown,
  ExpenseCategoryDetailResponse,
  ExpenseCategoryDto,
  ExpenseChargeDto,
  ExpenseDto,
  ExpenseMonthlyPoint,
  ExpenseTotal,
  ExpenseTypeBreakdown,
  ExpenseTypeDto,
  ExpenseVendorDetailResponse,
  SubscriptionDto,
} from './dto';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toExpenseDto(expense: Expense): ExpenseDto {
  return {
    id: expense._id!.toString(),
    vendor: effectiveVendor(expense),
    category: effectiveCategory(expense) as ExpenseCategoryDto,
    amount: expense.amount,
    currency: expense.currency,
    type: effectiveType(expense) as ExpenseTypeDto,
    transactionDate: expense.transactionDate.toISOString(),
    ...(expense.card ? { card: expense.card } : {}),
    ...(expense.notes ? { notes: expense.notes } : {}),
    originalVendor: expense.userVendor && expense.vendor !== expense.userVendor ? expense.vendor : undefined,
    originalCategory: expense.userCategory && expense.category !== expense.userCategory ? (expense.category as ExpenseCategoryDto) : undefined,
    originalType: expense.userType && expense.type !== expense.userType ? (expense.type as ExpenseTypeDto) : undefined,
  };
}

export function totalsByCurrency(expenses: ReadonlyArray<Expense>): ExpenseTotal[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) totals.set(expense.currency, (totals.get(expense.currency) ?? 0) + expense.amount);
  return [...totals.entries()].map(([currency, total]) => ({ currency, total: round2(total) }));
}

export function categoryBreakdown(expenses: ReadonlyArray<Expense>): ExpenseCategoryBreakdown[] {
  const breakdown = new Map<string, ExpenseCategoryBreakdown>();
  for (const expense of expenses) {
    const category = effectiveCategory(expense) as ExpenseCategoryDto;
    const key = `${category}|${expense.currency}`;
    const existing = breakdown.get(key);
    breakdown.set(key, existing ? { ...existing, total: existing.total + expense.amount, count: existing.count + 1 } : { category, currency: expense.currency, total: expense.amount, count: 1 });
  }
  return [...breakdown.values()].map((entry) => ({ ...entry, total: round2(entry.total) })).sort((a, b) => b.total - a.total);
}

export function typeBreakdown(expenses: ReadonlyArray<Expense>): ExpenseTypeBreakdown[] {
  const breakdown = new Map<string, ExpenseTypeBreakdown>();
  for (const expense of expenses) {
    const type = effectiveType(expense) as ExpenseTypeDto;
    const key = `${type}|${expense.currency}`;
    const existing = breakdown.get(key);
    breakdown.set(key, existing ? { ...existing, total: existing.total + expense.amount, count: existing.count + 1 } : { type, currency: expense.currency, total: expense.amount, count: 1 });
  }
  return [...breakdown.values()].map((entry) => ({ ...entry, total: round2(entry.total) })).sort((a, b) => b.total - a.total);
}

export function pickPrimaryCurrency(expenses: ReadonlyArray<Expense>): string {
  if (expenses.length === 0) return DEFAULT_CURRENCY;
  const totals = new Map<string, number>();
  for (const expense of expenses) totals.set(expense.currency, (totals.get(expense.currency) ?? 0) + expense.amount);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function monthlyTotalsForCurrency(expenses: ReadonlyArray<Expense>, currency: string, months = 12, now = new Date()): ExpenseMonthlyPoint[] {
  const buckets = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(formatInTimeZone(date, DEFAULT_TIMEZONE, 'yyyy-MM'), 0);
  }
  for (const expense of expenses) {
    if (expense.currency !== currency) continue;
    const month = formatInTimeZone(expense.transactionDate, DEFAULT_TIMEZONE, 'yyyy-MM');
    if (buckets.has(month)) buckets.set(month, (buckets.get(month) ?? 0) + expense.amount);
  }
  return [...buckets.entries()].map(([month, total]) => ({ month, total: round2(total) }));
}

export function buildCategoryDetail(
  category: ExpenseCategory,
  expenses: ReadonlyArray<Expense>,
  scopeMonth: string | null,
  monthlyContextExpenses?: ReadonlyArray<Expense>,
): ExpenseCategoryDetailResponse {
  const sorted = [...expenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  const primaryCurrency = pickPrimaryCurrency(sorted.length > 0 ? sorted : (monthlyContextExpenses ?? []));
  const primary = sorted.filter((expense) => expense.currency === primaryCurrency);
  const total = primary.reduce((sum, expense) => sum + expense.amount, 0);
  const vendorMap = new Map<string, { vendor: string; total: number; count: number }>();
  for (const expense of primary) {
    const vendor = effectiveVendor(expense);
    const existing = vendorMap.get(vendor);
    vendorMap.set(vendor, existing ? { ...existing, total: existing.total + expense.amount, count: existing.count + 1 } : { vendor, total: expense.amount, count: 1 });
  }
  return {
    category: category as ExpenseCategoryDto,
    scope: scopeMonth ? 'month' : 'all',
    month: scopeMonth,
    currency: primaryCurrency,
    total: round2(total),
    count: primary.length,
    avg: round2(primary.length > 0 ? total / primary.length : 0),
    firstDate: sorted.length > 0 ? sorted[sorted.length - 1].transactionDate.toISOString() : null,
    lastDate: sorted.length > 0 ? sorted[0].transactionDate.toISOString() : null,
    totals: totalsByCurrency(sorted),
    monthlyTotals: monthlyTotalsForCurrency(monthlyContextExpenses ?? sorted, primaryCurrency),
    topVendors: [...vendorMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((vendor) => ({ ...vendor, total: round2(vendor.total) })),
    expenses: sorted.map(toExpenseDto),
  };
}

export function buildVendorDetail(name: string, expenses: ReadonlyArray<Expense>): ExpenseVendorDetailResponse {
  const sorted = [...expenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  const primaryCurrency = pickPrimaryCurrency(sorted);
  const primary = sorted.filter((expense) => expense.currency === primaryCurrency);
  const total = primary.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = new Map<string, number>();
  for (const expense of primary) {
    const category = effectiveCategory(expense);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + expense.amount);
  }
  const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    vendor: sorted.length > 0 ? effectiveVendor(sorted[0]) : name,
    currency: primaryCurrency,
    total: round2(total),
    count: primary.length,
    avg: round2(primary.length > 0 ? total / primary.length : 0),
    firstDate: sorted.length > 0 ? sorted[sorted.length - 1].transactionDate.toISOString() : null,
    lastDate: sorted.length > 0 ? sorted[0].transactionDate.toISOString() : null,
    totals: totalsByCurrency(sorted),
    dominantCategory: topCategory ? { category: topCategory[0] as ExpenseCategoryDto, share: total > 0 ? topCategory[1] / total : 0 } : null,
    monthlyTotals: monthlyTotalsForCurrency(sorted, primaryCurrency),
    expenses: sorted.map(toExpenseDto),
  };
}

export function computeTopCharges(expenses: ReadonlyArray<Expense>, limit: number): ExpenseChargeDto[] {
  return [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((expense) => ({
      id: expense._id!.toString(),
      vendor: effectiveVendor(expense),
      amount: round2(expense.amount),
      currency: expense.currency,
      transactionDate: expense.transactionDate.toISOString(),
      category: effectiveCategory(expense) as ExpenseCategoryDto,
      ...(expense.card ? { card: expense.card } : {}),
    }));
}

export function toSubscriptionDto(subscription: Subscription): SubscriptionDto {
  return {
    vendor: subscription.vendor,
    category: subscription.category as ExpenseCategoryDto,
    currency: subscription.currency,
    amount: subscription.amount,
    avgAmount: subscription.avgAmount,
    cadenceDays: subscription.cadenceDays,
    monthlyEquivalent: monthlyEquivalent(subscription),
    occurrences: subscription.occurrences,
    firstChargedAt: subscription.firstChargedAt,
    lastChargedAt: subscription.lastChargedAt,
    nextExpectedAt: subscription.nextExpectedAt,
  };
}
