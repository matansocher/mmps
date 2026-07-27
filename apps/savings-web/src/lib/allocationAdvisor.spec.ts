import { describe, expect, it } from 'vitest';
import type { Holding, PortfolioSettings } from '../types';
import type { PortfolioExposure } from './allocationAdvisor';
import { computeExposure, distanceToTargets, rankCandidates } from './allocationAdvisor';

const settings: PortfolioSettings = {
  depositAmountIls: 0,
  fxLimitPercent: 50,
  solidTargetPercent: 50,
  geographyTargets: { ישראל: 50, ארהב: 50 },
};

function holding(overrides: Partial<Holding>): Holding {
  return {
    id: 'holding',
    account: 'manual',
    name: 'נכס',
    geography: 'ישראל',
    currentAmountIls: 0,
    targetAmountIls: 0,
    currencyExposure: 'ils',
    assetType: 'equity',
    owner: 'shared',
    note: '',
    ...overrides,
  };
}

describe('computeExposure()', () => {
  it('returns zeroed exposure for an empty portfolio', () => {
    const exposure = computeExposure([]);
    expect(exposure.fxPercent).toEqual(0);
    expect(exposure.solidPercent).toEqual(0);
    expect(exposure.geographyPercent.size).toEqual(0);
  });

  it('computes fx/solid percentages and per-region shares', () => {
    const holdings = [
      holding({ id: 'a', currentAmountIls: 60, currencyExposure: 'fx', assetType: 'solid', geography: 'ארהב' }),
      holding({ id: 'b', currentAmountIls: 40, currencyExposure: 'ils', assetType: 'equity', geography: 'ישראל' }),
    ];
    const exposure = computeExposure(holdings);
    expect(exposure.fxPercent).toBeCloseTo(60);
    expect(exposure.solidPercent).toBeCloseTo(60);
    expect(exposure.geographyPercent.get('ארהב')).toBeCloseTo(60);
    expect(exposure.geographyPercent.get('ישראל')).toBeCloseTo(40);
  });

  it('computes weighted exposure from breakdowns', () => {
    const holdings = [
      holding({ id: 'mixed', currentAmountIls: 100, currencyBreakdown: { fx: 60, ils: 40 }, assetBreakdown: { equity: 30, solid: 70 }, geographyBreakdown: { 'ישראל': 50, 'ארהב': 50 } }),
    ];
    const exposure = computeExposure(holdings);
    expect(exposure.fxPercent).toBeCloseTo(60);
    expect(exposure.solidPercent).toBeCloseTo(70);
    expect(exposure.geographyPercent.get('ישראל')).toBeCloseTo(50);
    expect(exposure.geographyPercent.get('ארהב')).toBeCloseTo(50);
  });
});

describe('distanceToTargets()', () => {
  it('is zero when exposure exactly matches every target', () => {
    const exposure = computeExposure([
      holding({ id: 'a', currentAmountIls: 50, currencyExposure: 'fx', assetType: 'solid', geography: 'ארהב' }),
      holding({ id: 'b', currentAmountIls: 50, currencyExposure: 'ils', assetType: 'equity', geography: 'ישראל' }),
    ]);
    expect(distanceToTargets(exposure, settings, ['ישראל', 'ארהב'])).toBeCloseTo(0);
  });

  it('grows when exposure drifts away from targets', () => {
    const exposure = computeExposure([holding({ id: 'a', currentAmountIls: 100, currencyExposure: 'ils', assetType: 'equity', geography: 'ישראל' })]);
    expect(distanceToTargets(exposure, settings, ['ישראל', 'ארהב'])).toBeGreaterThan(0);
  });

  it('weights the farthest category more heavily than a near one (squared gaps)', () => {
    // One category 20% off contributes 400; two categories 10% off each contribute only 200 combined.
    const farOneCategory: PortfolioExposure = { fxPercent: 70, solidPercent: 50, geographyPercent: new Map([['ישראל', 50], ['ארהב', 50]]) };
    const closeTwoCategories: PortfolioExposure = { fxPercent: 60, solidPercent: 60, geographyPercent: new Map([['ישראל', 50], ['ארהב', 50]]) };
    expect(distanceToTargets(farOneCategory, settings, ['ישראל', 'ארהב'])).toBeGreaterThan(distanceToTargets(closeTwoCategories, settings, ['ישראל', 'ארהב']));
  });

  it('uses the single worst region gap for the geography category', () => {
    const oneRegionFar: PortfolioExposure = { fxPercent: 50, solidPercent: 50, geographyPercent: new Map([['ישראל', 70], ['ארהב', 30]]) };
    // Worst region gap is 20 → 400; fx and solid contribute nothing.
    expect(distanceToTargets(oneRegionFar, settings, ['ישראל', 'ארהב'])).toBeCloseTo(400);
  });
});

describe('rankCandidates()', () => {
  it('returns no candidates when the deposit amount is not positive', () => {
    expect(rankCandidates([holding({ id: 'a', currentAmountIls: 100 })], settings, 0)).toEqual([]);
  });

  it('ranks the holding that best closes the current gaps first', () => {
    const holdings = [
      holding({ id: 'ils-solid', currentAmountIls: 70, currencyExposure: 'ils', assetType: 'solid', geography: 'ישראל' }),
      holding({ id: 'fx-equity-us', currentAmountIls: 30, currencyExposure: 'fx', assetType: 'equity', geography: 'ארהב' }),
    ];
    // Currently: fx 30%, solid 70%, ישראל 70%, ארהב 30% — all far from the 50/50 targets.
    // Depositing into fx-equity-us pushes fx/equity/ארהב toward 50%, closing every gap at once.
    const ranked = rankCandidates(holdings, settings, 100, 3);

    expect(ranked[0]?.holding.id).toEqual('fx-equity-us');
    expect(ranked[0]?.improvement).toBeGreaterThan(ranked[1]?.improvement ?? 0);
    expect(ranked).toHaveLength(2);
  });

  it('limits the result to topN candidates', () => {
    const holdings = [holding({ id: 'a' }), holding({ id: 'b' }), holding({ id: 'c' }), holding({ id: 'd' })];
    expect(rankCandidates(holdings, settings, 100, 3)).toHaveLength(3);
  });

  it('only suggests manual holdings, never managed ones', () => {
    const holdings = [
      holding({ id: 'managed-a', account: 'managed', currentAmountIls: 50, currencyExposure: 'fx', assetType: 'equity', geography: 'ארהב' }),
      holding({ id: 'manual-a', account: 'manual', currentAmountIls: 50, currencyExposure: 'ils', assetType: 'solid', geography: 'ישראל' }),
    ];
    const ranked = rankCandidates(holdings, settings, 100, 3);
    expect(ranked.every((candidate) => candidate.holding.account === 'manual')).toBe(true);
    expect(ranked.some((candidate) => candidate.holding.id === 'managed-a')).toBe(false);
  });

  it('prioritizes the manual holding that closes the farthest category first', () => {
    // fx is 30% off target (far); geography is only ~7% off (near). The manual holding that fixes
    // the far fx gap should rank ahead of one that only nudges the already-near geography split.
    const holdings = [
      holding({ id: 'ils-anchor', account: 'managed', currentAmountIls: 80, currencyExposure: 'ils', assetType: 'solid', geography: 'ישראל' }),
      holding({ id: 'fx-fixer', account: 'manual', currentAmountIls: 20, currencyExposure: 'fx', assetType: 'equity', geography: 'ישראל' }),
      holding({ id: 'geo-nudger', account: 'manual', currentAmountIls: 20, currencyExposure: 'ils', assetType: 'solid', geography: 'ארהב' }),
    ];
    const ranked = rankCandidates(holdings, settings, 60, 3);
    expect(ranked[0]?.holding.id).toEqual('fx-fixer');
  });
});
