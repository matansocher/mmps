import type { BreakdownRecord, Holding } from '../types';

export function effectiveFxPercent(holding: Pick<Holding, 'currencyExposure' | 'currencyBreakdown'>): number {
  if (holding.currencyBreakdown) return holding.currencyBreakdown.fx ?? 0;
  return holding.currencyExposure === 'fx' ? 100 : 0;
}

export function effectiveSolidPercent(holding: Pick<Holding, 'assetType' | 'assetBreakdown'>): number {
  if (holding.assetBreakdown) return holding.assetBreakdown.solid ?? 0;
  return holding.assetType === 'solid' ? 100 : 0;
}

export function effectiveGeography(holding: Pick<Holding, 'geography' | 'geographyBreakdown'>): Map<string, number> {
  if (holding.geographyBreakdown) {
    return new Map(Object.entries(holding.geographyBreakdown).filter(([, v]) => v > 0));
  }
  const label = holding.geography.trim();
  if (!label) return new Map();
  return new Map([[label, 100]]);
}

export function hasBreakdown(holding: Holding, field: 'geography' | 'currency' | 'asset'): boolean {
  if (field === 'geography') return holding.geographyBreakdown !== undefined;
  if (field === 'currency') return holding.currencyBreakdown !== undefined;
  return holding.assetBreakdown !== undefined;
}

export function dominantKey(breakdown: BreakdownRecord): string {
  let maxKey = '';
  let maxValue = -1;
  for (const [key, value] of Object.entries(breakdown)) {
    if (value > maxValue) {
      maxKey = key;
      maxValue = value;
    }
  }
  return maxKey;
}

export function isValidBreakdown(breakdown: BreakdownRecord): boolean {
  const values = Object.values(breakdown);
  if (values.length === 0) return false;
  if (values.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100)) return false;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.abs(total - 100) < 0.5;
}

export function hasInvalidBreakdown(holding: Pick<Holding, 'geographyBreakdown' | 'currencyBreakdown' | 'assetBreakdown'>): boolean {
  if (holding.geographyBreakdown && !isValidBreakdown(holding.geographyBreakdown)) return true;
  if (holding.currencyBreakdown && !isValidBreakdown(holding.currencyBreakdown)) return true;
  if (holding.assetBreakdown && !isValidBreakdown(holding.assetBreakdown)) return true;
  return false;
}
