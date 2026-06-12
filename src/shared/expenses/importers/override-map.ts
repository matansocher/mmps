// When the user renames or recategorizes an existing expense (via the mini-app), that override
// is stored on that single document. Without this map, every future statement reintroduces the
// original raw vendor text and re-derives the category from the sector — silently undoing the
// user's correction for all new charges.

import type { Expense, ExpenseCategory } from '@shared/expenses';
import { normalizeName } from './dedup';

export type OverrideEntry = {
  readonly userVendor?: string;
  readonly userCategory?: ExpenseCategory;
  readonly mostRecent: number;
};

export function buildOverrideMap(pool: ReadonlyArray<Expense>): Map<string, OverrideEntry> {
  const map = new Map<string, OverrideEntry>();
  for (const e of pool) registerOverride(map, e);
  return map;
}

export function findOverride(rowVendor: string, map: Map<string, OverrideEntry>): OverrideEntry | null {
  const n = normalizeName(rowVendor);
  if (!n) return null;
  const exact = map.get(n);
  if (exact) return exact;
  if (n.length < 3) return null;
  let best: OverrideEntry | null = null;
  for (const [key, entry] of map) {
    if (key.length < 3) continue;
    if (key.includes(n) || n.includes(key)) {
      if (!best || entry.mostRecent > best.mostRecent) best = entry;
    }
  }
  return best;
}

export function registerOverride(map: Map<string, OverrideEntry>, expense: Expense): void {
  if (!expense.userVendor && !expense.userCategory) return;
  const ts = expense.transactionDate?.getTime?.() ?? expense.createdAt?.getTime?.() ?? 0;
  const keys = new Set<string>();
  const raw = normalizeName(expense.vendor);
  if (raw) keys.add(raw);
  if (expense.userVendor) {
    const renamed = normalizeName(expense.userVendor);
    if (renamed) keys.add(renamed);
  }
  for (const k of keys) {
    const prev = map.get(k);
    if (!prev || ts > prev.mostRecent) {
      map.set(k, { userVendor: expense.userVendor, userCategory: expense.userCategory, mostRecent: ts });
    }
  }
}
