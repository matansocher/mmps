import type { Expense } from '@shared/expenses';

export type CurrencyTotal = { currency: string; total: number };

export function totalsByCurrency(expenses: ReadonlyArray<Expense>): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.currency, (map.get(e.currency) ?? 0) + e.amount);
  return Array.from(map.entries()).map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }));
}
