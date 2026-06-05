import { endOfDay, format, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { getExpensesBetween } from '../mongo';
import { CATEGORY_EMOJI, type Expense, type ExpenseCategory } from '../types';
import { buildMonthlyAnalytics, effectiveCategory, type MonthlyAnalytics } from './analytics';

const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function zonedDay(date: Date): { from: Date; to: Date } {
  const zoned = toZonedTime(date, DEFAULT_TIMEZONE);
  return { from: startOfDay(zoned), to: endOfDay(zoned) };
}

function totalsByCurrency(expenses: ReadonlyArray<Expense>): Array<{ currency: string; total: number }> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.currency, (map.get(e.currency) || 0) + e.amount);
  }
  return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }));
}

function totalsByCategory(expenses: ReadonlyArray<Expense>): Array<{ category: ExpenseCategory; total: number; currency: string }> {
  const map = new Map<string, { category: ExpenseCategory; total: number; currency: string }>();
  for (const e of expenses) {
    const cat = effectiveCategory(e);
    const key = `${cat}|${e.currency}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, total: existing.total + e.amount });
    } else {
      map.set(key, { category: cat, total: e.amount, currency: e.currency });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function topVendors(expenses: ReadonlyArray<Expense>, n = 3): Array<{ vendor: string; total: number; currency: string }> {
  const map = new Map<string, { vendor: string; total: number; currency: string }>();
  for (const e of expenses) {
    const key = `${e.vendor}|${e.currency}`;
    const existing = map.get(key);
    if (existing) map.set(key, { ...existing, total: existing.total + e.amount });
    else map.set(key, { vendor: e.vendor, total: e.amount, currency: e.currency });
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

export async function getDailyExpenses(date: Date = new Date()): Promise<Expense[]> {
  const { from, to } = zonedDay(date);
  return getExpensesBetween(from, to);
}

export async function getWeeklyExpenses(date: Date = new Date()): Promise<Expense[]> {
  const zoned = toZonedTime(date, DEFAULT_TIMEZONE);
  const from = startOfWeek(zoned, { weekStartsOn: 0 });
  return getExpensesBetween(from, endOfDay(zoned));
}

export async function getMonthlyExpenses(date: Date = new Date()): Promise<Expense[]> {
  const zoned = toZonedTime(date, DEFAULT_TIMEZONE);
  return getExpensesBetween(startOfMonth(zoned), endOfDay(zoned));
}

export function formatDailySummary(date: Date, expenses: ReadonlyArray<Expense>): string {
  const dayLabel = format(toZonedTime(date, DEFAULT_TIMEZONE), 'EEEE, d MMM');
  if (expenses.length === 0) return `*Expenses for ${dayLabel}*\n\n_No expenses recorded._`;

  const totals = totalsByCurrency(expenses);
  const totalLine = totals.map((t) => formatAmount(t.total, t.currency)).join(' · ');
  const categories = totalsByCategory(expenses);
  const vendors = topVendors(expenses, 3);

  const lines: string[] = [
    `*Expenses for ${dayLabel}*`,
    `_${expenses.length} transaction${expenses.length === 1 ? '' : 's'} · ${totalLine}_`,
    '',
    '*By category*',
    ...categories.map((c) => `${CATEGORY_EMOJI[c.category]} ${c.category} — ${formatAmount(c.total, c.currency)}`),
  ];
  if (vendors.length > 0) {
    lines.push('', '*Top vendors*', ...vendors.map((v) => `• ${v.vendor} — ${formatAmount(v.total, v.currency)}`));
  }
  lines.push('', '*Transactions*', ...expenses.map((e) => `${CATEGORY_EMOJI[effectiveCategory(e)]} ${e.vendor} — ${formatAmount(e.amount, e.currency)}`));
  return lines.join('\n');
}

function formatMoMLine(currency: string, current: number, previous: number, deltaPct: number | null): string {
  const arrow = deltaPct === null ? '—' : deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '◆';
  const pct = deltaPct === null ? 'new vs prev month' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`;
  return `${formatAmount(current, currency)} ${arrow} ${pct} (prev ${formatAmount(previous, currency)})`;
}

export function formatPeriodSummary(label: string, expenses: ReadonlyArray<Expense>): string {
  if (expenses.length === 0) return `*${label}*\n\n_No expenses recorded._`;
  const totals = totalsByCurrency(expenses);
  const totalLine = totals.map((t) => formatAmount(t.total, t.currency)).join(' · ');
  const categories = totalsByCategory(expenses);
  const vendors = topVendors(expenses, 5);
  const lines: string[] = [
    `*${label}*`,
    `_${expenses.length} transaction${expenses.length === 1 ? '' : 's'} · ${totalLine}_`,
    '',
    '*By category*',
    ...categories.map((c) => `${CATEGORY_EMOJI[c.category]} ${c.category} — ${formatAmount(c.total, c.currency)}`),
  ];
  if (vendors.length > 0) {
    lines.push('', '*Top vendors*', ...vendors.map((v) => `• ${v.vendor} — ${formatAmount(v.total, v.currency)}`));
  }
  return lines.join('\n');
}

export function formatMonthlyAnalytics(a: MonthlyAnalytics): string {
  if (a.count === 0) return `*${a.month}*\n\n_No expenses recorded._`;
  const totalLine = a.totals.map((t) => formatAmount(t.total, t.currency)).join(' · ');
  const lines: string[] = [
    `*${a.month}*`,
    `_${a.count} transaction${a.count === 1 ? '' : 's'} · ${totalLine}_`,
    '',
    '*Month over month*',
    ...a.monthOverMonth.map((m) => `• ${formatMoMLine(m.currency, m.current, m.previous, m.deltaPct)}`),
    '',
    '*Top categories*',
    ...a.topCategories.map((c) => `${CATEGORY_EMOJI[c.category]} ${c.category} — ${formatAmount(c.total, c.currency)} (${c.count})`),
    '',
    '*Top vendors*',
    ...a.topVendors.map((v) => `• ${v.vendor} — ${formatAmount(v.total, v.currency)} (${v.count})`),
  ];
  return lines.join('\n');
}

export async function buildDailySummary(date: Date = new Date()): Promise<{ text: string; count: number; expenses: Expense[] }> {
  const expenses = await getDailyExpenses(date);
  return { text: formatDailySummary(date, expenses), count: expenses.length, expenses };
}

export async function buildYesterdaySummary(): Promise<{ text: string; count: number; expenses: Expense[] }> {
  return buildDailySummary(subDays(new Date(), 1));
}

export async function buildMonthlyAnalyticsSummary(date: Date = new Date()): Promise<{ text: string; analytics: MonthlyAnalytics }> {
  const analytics = await buildMonthlyAnalytics(date, { topN: 5 });
  return { text: formatMonthlyAnalytics(analytics), analytics };
}

export { totalsByCurrency, totalsByCategory, formatAmount };
