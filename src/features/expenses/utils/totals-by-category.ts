import { effectiveCategory, type Expense } from '@shared/expenses';

export type CategoryTotal = { category: string; currency: string; total: number; count: number };

export function totalsByCategory(expenses: ReadonlyArray<Expense>, n: number): CategoryTotal[] {
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
  return Array.from(map.values())
    .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}
