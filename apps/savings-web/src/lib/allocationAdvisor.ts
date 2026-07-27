import { effectiveFxPercent, effectiveSolidPercent } from './breakdown';
import { geographyComposition } from './composition';
import type { Holding, PortfolioSettings } from '../types';
import { GEOGRAPHY_LABELS } from '../types';

export type PortfolioExposure = {
  readonly fxPercent: number;
  readonly solidPercent: number;
  readonly geographyPercent: ReadonlyMap<string, number>;
};

export type AdvisorCandidate = {
  readonly holding: Holding;
  readonly improvement: number;
  readonly primaryImprovement: number;
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
  const fxIls = sum(holdings.map((holding) => nonNegative(holding.currentAmountIls) * effectiveFxPercent(holding) / 100));
  const solidIls = sum(holdings.map((holding) => nonNegative(holding.currentAmountIls) * effectiveSolidPercent(holding) / 100));
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
  const geographyGap = geographyGaps.length > 0 ? Math.max(...geographyGaps) : 0;
  // Square each category's gap so the category farthest from its target dominates the score.
  // This makes a deposit that shrinks the largest gap yield the biggest improvement, instead of
  // treating a category already near its target the same as one far from it.
  return fxGap * fxGap + solidGap * solidGap + geographyGap * geographyGap;
}

type CategoryGap = { readonly key: string; readonly gap: number };

// The individual per-category gaps (in percentage points), geography split into one entry per region.
// Used to identify the single category that is currently farthest from its target so the ranking can
// prioritize closing it, rather than optimizing only the net sum (which a holding can "game" by
// helping several small gaps while worsening the dominant one).
function categoryGaps(exposure: PortfolioExposure, settings: PortfolioSettings, geographyLabels: readonly string[]): CategoryGap[] {
  return [
    { key: 'fx', gap: Math.abs(exposure.fxPercent - settings.fxLimitPercent) },
    { key: 'solid', gap: Math.abs(exposure.solidPercent - settings.solidTargetPercent) },
    ...geographyLabels.map((label) => ({ key: `geo:${label}`, gap: Math.abs((exposure.geographyPercent.get(label) ?? 0) - (settings.geographyTargets[label] ?? 0)) })),
  ];
}

function gapForCategory(exposure: PortfolioExposure, settings: PortfolioSettings, geographyLabels: readonly string[], key: string): number {
  return categoryGaps(exposure, settings, geographyLabels).find((entry) => entry.key === key)?.gap ?? 0;
}

function depositedHoldings(holdings: readonly Holding[], holdingId: string, depositAmountIls: number): Holding[] {
  return holdings.map((holding) => (holding.id === holdingId ? { ...holding, currentAmountIls: nonNegative(holding.currentAmountIls) + depositAmountIls } : holding));
}

function explainCandidate(before: PortfolioExposure, after: PortfolioExposure, settings: PortfolioSettings, geographyLabels: readonly string[], primaryKey?: string): string {
  const movers: { readonly key: string; readonly label: string; readonly reduction: number }[] = [
    { key: 'fx', label: 'חשיפת המט״ח', reduction: Math.abs(before.fxPercent - settings.fxLimitPercent) - Math.abs(after.fxPercent - settings.fxLimitPercent) },
    { key: 'solid', label: 'איזון סולידי-מנייתי', reduction: Math.abs(before.solidPercent - settings.solidTargetPercent) - Math.abs(after.solidPercent - settings.solidTargetPercent) },
    ...geographyLabels.map((label) => ({
      key: `geo:${label}`,
      label: `אזור ${label}`,
      reduction: Math.abs((before.geographyPercent.get(label) ?? 0) - (settings.geographyTargets[label] ?? 0)) - Math.abs((after.geographyPercent.get(label) ?? 0) - (settings.geographyTargets[label] ?? 0)),
    })),
  ];

  // Warn when the deposit pushes the farthest category further from its target, so a candidate that
  // only helps smaller gaps isn't presented as if it fixed the dominant problem.
  const primaryMover = primaryKey ? movers.find((mover) => mover.key === primaryKey) : undefined;
  if (primaryMover && primaryMover.reduction < -0.05) return `שימו לב: מרחיקה מהיעד את ${primaryMover.label} (המרכיב הרחוק ביותר כרגע).`;

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
  const beforeExposure = computeExposure(holdings);
  const distanceBefore = distanceToTargets(beforeExposure, settings, GEOGRAPHY_LABELS);

  // The single category currently farthest from its target. The ranking prioritizes shrinking this
  // gap so a deposit can't win merely by nudging several small gaps while worsening the dominant one.
  const farthest = categoryGaps(beforeExposure, settings, GEOGRAPHY_LABELS).sort((first, second) => second.gap - first.gap)[0];
  const primaryGapBefore = farthest?.gap ?? 0;

  // Only manual holdings (חלק בתיק = ידני) are under the user's control, so the deposit can only be
  // suggested there. Managed holdings are excluded as candidates, but the exposure/distance is still
  // computed over the whole portfolio so the effect on the full portfolio is measured correctly.
  return holdings
    .filter((holding) => holding.account === 'manual')
    .map((holding) => {
      const afterExposure = computeExposure(depositedHoldings(holdings, holding.id, depositAmountIls));
      const distanceAfter = distanceToTargets(afterExposure, settings, GEOGRAPHY_LABELS);
      const primaryGapAfter = farthest ? gapForCategory(afterExposure, settings, GEOGRAPHY_LABELS, farthest.key) : 0;
      return {
        holding,
        improvement: distanceBefore - distanceAfter,
        primaryImprovement: primaryGapBefore - primaryGapAfter,
        distanceBefore,
        distanceAfter,
        explanation: explainCandidate(beforeExposure, afterExposure, settings, GEOGRAPHY_LABELS, farthest?.key),
      };
    })
    // Primary: how much the deposit closes the farthest category's gap. Secondary: total distance
    // improvement, used as a tiebreaker when the primary effect is effectively equal.
    .sort((first, second) => (Math.abs(second.primaryImprovement - first.primaryImprovement) > 0.01 ? second.primaryImprovement - first.primaryImprovement : second.improvement - first.improvement))
    .slice(0, topN);
}
