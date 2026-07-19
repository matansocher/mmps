import type { Holding } from '../types';

export type CompositionSlice = {
  readonly label: string;
  readonly amountIls: number;
  readonly percent: number;
};

export type CompositionComparisonRow = {
  readonly label: string;
  readonly beforePercent: number;
  readonly afterPercent: number;
  readonly beforeAmountIls: number;
  readonly afterAmountIls: number;
};

const UNSPECIFIED_REGION = 'ללא אזור';

export const GEOGRAPHY_PALETTE: readonly string[] = ['#176b73', '#8a4fbe', '#b45309', '#2f9e44', '#be185d', '#1d4ed8', '#5f6f7c'];

export function geographyColor(index: number): string {
  return GEOGRAPHY_PALETTE[index % GEOGRAPHY_PALETTE.length];
}

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function distinctGeographyLabels(holdings: readonly Holding[]): string[] {
  const labels = new Set<string>();
  for (const holding of holdings) {
    labels.add(holding.geography.trim() || UNSPECIFIED_REGION);
  }
  return [...labels];
}

export function geographyComposition(holdings: readonly Holding[]): CompositionSlice[] {
  const byRegion = new Map<string, number>();
  let total = 0;
  for (const holding of holdings) {
    const amount = nonNegative(holding.currentAmountIls);
    if (amount <= 0) continue;
    const label = holding.geography.trim() || UNSPECIFIED_REGION;
    byRegion.set(label, (byRegion.get(label) ?? 0) + amount);
    total += amount;
  }
  return [...byRegion.entries()].map(([label, amountIls]) => ({ label, amountIls, percent: total > 0 ? (amountIls / total) * 100 : 0 })).sort((first, second) => second.amountIls - first.amountIls);
}

export function compareGeography(before: readonly Holding[], after: readonly Holding[]): CompositionComparisonRow[] {
  const beforeSlices = new Map(geographyComposition(before).map((slice) => [slice.label, slice]));
  const afterSlices = new Map(geographyComposition(after).map((slice) => [slice.label, slice]));
  const labels = new Set<string>([...beforeSlices.keys(), ...afterSlices.keys()]);
  return [...labels]
    .map((label) => ({
      label,
      beforePercent: beforeSlices.get(label)?.percent ?? 0,
      afterPercent: afterSlices.get(label)?.percent ?? 0,
      beforeAmountIls: beforeSlices.get(label)?.amountIls ?? 0,
      afterAmountIls: afterSlices.get(label)?.amountIls ?? 0,
    }))
    .sort((first, second) => second.afterAmountIls - first.afterAmountIls);
}
