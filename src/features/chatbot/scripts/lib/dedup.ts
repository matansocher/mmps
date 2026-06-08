import { effectiveVendor, type Expense } from '@shared/expenses';
import type { ParsedRow } from '../parsers/types';

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0591-\u05c7]/g, '') // strip Hebrew niqqud
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

export function isVendorMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export type DupResult =
  | { readonly kind: 'unique' }
  | { readonly kind: 'duplicate'; readonly match: Expense }
  | { readonly kind: 'ambiguous'; readonly candidates: ReadonlyArray<Expense> };

export function findDuplicate(row: ParsedRow, pool: ReadonlyArray<Expense>): DupResult {
  const sameDateAmount = pool.filter(
    (e) => e.currency === row.currency && Math.abs(e.amount - row.amount) < 0.01 && sameCalendarDay(e.transactionDate, row.transactionDate),
  );
  if (sameDateAmount.length === 0) return { kind: 'unique' };

  const vendorMatches = sameDateAmount.filter((e) => isVendorMatch(effectiveVendor(e), row.vendor));
  if (vendorMatches.length === 1) return { kind: 'duplicate', match: vendorMatches[0] };
  if (vendorMatches.length > 1) return { kind: 'ambiguous', candidates: vendorMatches };
  // Date + amount matched, but vendor didn't — conservatively treat as ambiguous (user may have renamed).
  return { kind: 'ambiguous', candidates: sameDateAmount };
}
