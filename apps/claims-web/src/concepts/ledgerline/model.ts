import { estimateSavings } from '../../content/index.ts';
import type { Lang } from '../../lib/i18n.tsx';

export type Model = {
  readonly claimsPerYear: number;
  readonly avgClaim: number;
  readonly fraudRate: number;
  readonly catchRate: number;
};

export type ModelTotals = {
  readonly paid: number;
  readonly leakage: number;
  readonly saved: number;
  readonly remaining: number;
};

export const DEFAULT_MODEL: Model = { claimsPerYear: 120000, avgClaim: 1800, fraudRate: 0.1, catchRate: 0.3 };

export function totals(model: Model): ModelTotals {
  const { leakage, saved } = estimateSavings(model);
  return { paid: model.claimsPerYear * model.avgClaim, leakage, saved, remaining: leakage - saved };
}

const SCALES: readonly { readonly at: number; readonly en: string; readonly he: string }[] = [
  { at: 1e9, en: 'B', he: ' מיליארד' },
  { at: 1e6, en: 'M', he: ' מיליון' },
  { at: 1e3, en: 'K', he: ' אלף' },
];

// Format: "$21.6M" / "₪21.6 מיליון"
export function money(n: number, lang: Lang): string {
  const cur = lang === 'he' ? '₪' : '$';
  const abs = Math.abs(n);
  const scale = SCALES.find((s) => abs >= s.at);
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  if (!scale) return `${cur}${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(abs)}`;
  const v = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(abs / scale.at);
  return `${cur}${v}${scale[lang]}`;
}

export function count(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US', { maximumFractionDigits: 0 }).format(n);
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
