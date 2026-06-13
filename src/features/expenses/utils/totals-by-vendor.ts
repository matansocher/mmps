import { effectiveVendor, type Expense } from '@shared/expenses';

export type VendorTotal = { vendor: string; currency: string; total: number; count: number };

export function totalsByVendor(expenses: ReadonlyArray<Expense>, n: number): VendorTotal[] {
  const map = new Map<string, VendorTotal>();
  for (const e of expenses) {
    const vendor = effectiveVendor(e);
    const key = `${vendor}|${e.currency}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, total: existing.total + e.amount, count: existing.count + 1 });
    } else {
      map.set(key, { vendor, currency: e.currency, total: e.amount, count: 1 });
    }
  }
  return Array.from(map.values())
    .map((v) => ({ ...v, total: Math.round(v.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}
