import { distinctGeographyLabels, geographyComposition } from './composition';
import type { Holding, PortfolioSettings } from '../types';

export type PortfolioExposure = {
  readonly fxPercent: number;
  readonly solidPercent: number;
  readonly geographyPercent: ReadonlyMap<string, number>;
};

export type AdvisorCandidate = {
  readonly holding: Holding;
  readonly improvement: number;
  readonly distanceBefore: number;
  readonly distanceAfter: number;
  readonly explanation: string;
};

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function computeExposure(holdings: readonly Holding[]): PortfolioExposure {
  const totalIls = sum(holdings.map((holding) => nonNegative(holding.currentAmountIls)));
  const fxIls = sum(holdings.filter((holding) => holding.currencyExposure === 'fx').map((holding) => nonNegative(holding.currentAmountIls)));
  const solidIls = sum(holdings.filter((holding) => holding.assetType === 'solid').map((holding) => nonNegative(holding.currentAmountIls)));
  const geographyPercent = new Map(geographyComposition(holdings).map((slice) => [slice.label, slice.percent]));

  return {
    fxPercent: totalIls > 0 ? (fxIls / totalIls) * 100 : 0,
    solidPercent: totalIls > 0 ? (solidIls / totalIls) * 100 : 0,
    geographyPercent,
  };
}

export function distanceToTargets(exposure: PortfolioExposure, settings: PortfolioSettings, geographyLabels: readonly string[]): number {
  const fxGap = Math.abs(exposure.fxPercent - settings.fxLimitPercent);
  const solidGap = Math.abs(exposure.solidPercent - settings.solidTargetPercent);
  const geographyGaps = geographyLabels.map((label) => Math.abs((exposure.geographyPercent.get(label) ?? 0) - (settings.geographyTargets[label] ?? 0)));
  const geographyGap = geographyGaps.length > 0 ? sum(geographyGaps) / geographyGaps.length : 0;
  return fxGap + solidGap + geographyGap;
}

function depositedHoldings(holdings: readonly Holding[], holdingId: string, depositAmountIls: number): Holding[] {
  return holdings.map((holding) => (holding.id === holdingId ? { ...holding, currentAmountIls: nonNegative(holding.currentAmountIls) + depositAmountIls } : holding));
}

function explainCandidate(before: PortfolioExposure, after: PortfolioExposure, settings: PortfolioSettings, geographyLabels: readonly string[]): string {
  const movers: { readonly label: string; readonly reduction: number }[] = [
    { label: 'חשיפת המט״ח', reduction: Math.abs(before.fxPercent - settings.fxLimitPercent) - Math.abs(after.fxPercent - settings.fxLimitPercent) },
    { label: 'איזון סולידי-מנייתי', reduction: Math.abs(before.solidPercent - settings.solidTargetPercent) - Math.abs(after.solidPercent - settings.solidTargetPercent) },
    ...geographyLabels.map((label) => ({
      label: `אזור ${label}`,
      reduction: Math.abs((before.geographyPercent.get(label) ?? 0) - (settings.geographyTargets[label] ?? 0)) - Math.abs((after.geographyPercent.get(label) ?? 0) - (settings.geographyTargets[label] ?? 0)),
    })),
  ];
  const topMovers = movers
    .filter((mover) => mover.reduction > 0.05)
    .sort((first, second) => second.reduction - first.reduction)
    .slice(0, 2)
    .map((mover) => mover.label);

  if (topMovers.length === 0) return 'התיק כבר קרוב ליעדים, כך שההוספה כאן משפיעה רק במעט.';
  return `מקרבת ליעד את ${topMovers.join(' ואת ')}.`;
}

export function rankCandidates(holdings: readonly Holding[], settings: PortfolioSettings, depositAmountIls: number, topN = 3): AdvisorCandidate[] {
  if (depositAmountIls <= 0) return [];
  const geographyLabels = distinctGeographyLabels(holdings);
  const beforeExposure = computeExposure(holdings);
  const distanceBefore = distanceToTargets(beforeExposure, settings, geographyLabels);

  return holdings
    .map((holding) => {
      const afterExposure = computeExposure(depositedHoldings(holdings, holding.id, depositAmountIls));
      const distanceAfter = distanceToTargets(afterExposure, settings, geographyLabels);
      return {
        holding,
        improvement: distanceBefore - distanceAfter,
        distanceBefore,
        distanceAfter,
        explanation: explainCandidate(beforeExposure, afterExposure, settings, geographyLabels),
      };
    })
    .sort((first, second) => second.improvement - first.improvement)
    .slice(0, topN);
}
