import { describe, expect, it } from 'vitest';
import type { Holding, PortfolioSettings } from '../types';
import { calculateRebalance } from './rebalance';

const settings: PortfolioSettings = {
  depositAmountIls: 0,
  fxLimitPercent: 45,
  solidTargetPercent: 20,
  geographyTargets: {},
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

function expectFinite(value: unknown): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value)).toEqual(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(expectFinite);
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(expectFinite);
  }
}

describe('calculateRebalance()', () => {
  it('returns a safe empty result for an empty portfolio', () => {
    const result = calculateRebalance([], settings);

    expect(result.rows).toEqual([]);
    expect(result.currentTotalIls).toEqual(0);
    expect(result.postDepositTotalIls).toEqual(0);
    expectFinite(result);
  });

  it('allocates a deposit only across manual holdings', () => {
    const result = calculateRebalance(
      [
        holding({ id: 'managed', account: 'managed', currentAmountIls: 500, targetAmountIls: 500 }),
        holding({ id: 'under', currentAmountIls: 60, targetAmountIls: 80 }),
        holding({ id: 'over', currentAmountIls: 40, targetAmountIls: 20 }),
      ],
      { ...settings, depositAmountIls: 100 },
    );

    expect(result.rows.find((row) => row.id === 'managed')?.allocationIls).toEqual(0);
    expect(result.rows.find((row) => row.id === 'under')?.allocationIls).toBeCloseTo(100);
    expect(result.rows.find((row) => row.id === 'over')?.allocationIls).toBeCloseTo(0);
    expect(result.allocatedDepositIls).toBeCloseTo(100);
  });

  it('normalizes target amounts into manual account weights', () => {
    const result = calculateRebalance([holding({ id: 'large', targetAmountIls: 300 }), holding({ id: 'small', targetAmountIls: 100 })], { ...settings, depositAmountIls: 400 });

    expect(result.rows.find((row) => row.id === 'large')?.targetWithinAccountPercent).toBeCloseTo(75);
    expect(result.rows.find((row) => row.id === 'small')?.targetWithinAccountPercent).toBeCloseTo(25);
    expect(result.rows.find((row) => row.id === 'large')?.allocationIls).toBeCloseTo(300);
  });

  it('falls back to normalized target weights when there are no positive gaps', () => {
    const result = calculateRebalance([holding({ id: 'first', currentAmountIls: 75, targetAmountIls: 75 }), holding({ id: 'second', currentAmountIls: 25, targetAmountIls: 25 })], settings);

    expect(result.allocationStrategy).toEqual('target_weights');
    expect(result.rows.map((row) => row.allocationIls)).toEqual([0, 0]);
  });

  it('keeps every numeric output finite for invalid and zero input values', () => {
    const result = calculateRebalance([holding({ currentAmountIls: Number.NaN, targetAmountIls: Number.POSITIVE_INFINITY })], {
      depositAmountIls: Number.NaN,
      fxLimitPercent: Number.POSITIVE_INFINITY,
      solidTargetPercent: -10,
      geographyTargets: {},
    });

    expectFinite(result);
  });

  it('computes weighted fx and solid percentages from breakdowns', () => {
    const result = calculateRebalance(
      [
        holding({ id: 'mixed', currentAmountIls: 100, currencyBreakdown: { fx: 70, ils: 30 }, assetBreakdown: { equity: 60, solid: 40 } }),
      ],
      settings,
    );

    expect(result.fxProjectedPercent).toBeCloseTo(70);
    expect(result.solidProjectedPercent).toBeCloseTo(40);
  });
});
