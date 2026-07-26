import { describe, expect, it } from 'vitest';
import { dominantKey, effectiveFxPercent, effectiveGeography, effectiveSolidPercent, hasBreakdown, hasInvalidBreakdown, isValidBreakdown } from './breakdown';
import type { Holding } from '../types';

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 'h1',
    account: 'manual',
    name: 'Test',
    geography: 'ארהב',
    currentAmountIls: 100,
    targetAmountIls: 100,
    currencyExposure: 'fx',
    assetType: 'equity',
    owner: 'shared',
    note: '',
    ...overrides,
  };
}

describe('effectiveFxPercent()', () => {
  it('returns 100 for fx single value', () => {
    expect(effectiveFxPercent(holding({ currencyExposure: 'fx' }))).toEqual(100);
  });

  it('returns 0 for ils single value', () => {
    expect(effectiveFxPercent(holding({ currencyExposure: 'ils' }))).toEqual(0);
  });

  it('reads from breakdown when present', () => {
    expect(effectiveFxPercent(holding({ currencyBreakdown: { fx: 70, ils: 30 } }))).toEqual(70);
  });
});

describe('effectiveSolidPercent()', () => {
  it('returns 100 for solid single value', () => {
    expect(effectiveSolidPercent(holding({ assetType: 'solid' }))).toEqual(100);
  });

  it('returns 0 for equity single value', () => {
    expect(effectiveSolidPercent(holding({ assetType: 'equity' }))).toEqual(0);
  });

  it('reads from breakdown when present', () => {
    expect(effectiveSolidPercent(holding({ assetBreakdown: { equity: 60, solid: 40 } }))).toEqual(40);
  });
});

describe('effectiveGeography()', () => {
  it('returns single geography at 100% when no breakdown', () => {
    const result = effectiveGeography(holding({ geography: 'ארהב' }));
    expect(result.get('ארהב')).toEqual(100);
    expect(result.size).toEqual(1);
  });

  it('returns empty map for empty geography string', () => {
    const result = effectiveGeography(holding({ geography: '' }));
    expect(result.size).toEqual(0);
  });

  it('returns breakdown entries when present', () => {
    const result = effectiveGeography(holding({ geographyBreakdown: { 'ארהב': 60, 'אירופה': 40 } }));
    expect(result.get('ארהב')).toEqual(60);
    expect(result.get('אירופה')).toEqual(40);
    expect(result.size).toEqual(2);
  });

  it('filters out zero-value entries from breakdown', () => {
    const result = effectiveGeography(holding({ geographyBreakdown: { 'ארהב': 100, 'אירופה': 0 } }));
    expect(result.size).toEqual(1);
  });
});

describe('hasBreakdown()', () => {
  it('returns false when no breakdown exists', () => {
    expect(hasBreakdown(holding(), 'geography')).toEqual(false);
    expect(hasBreakdown(holding(), 'currency')).toEqual(false);
    expect(hasBreakdown(holding(), 'asset')).toEqual(false);
  });

  it('returns true when breakdown exists', () => {
    expect(hasBreakdown(holding({ geographyBreakdown: { 'ארהב': 100 } }), 'geography')).toEqual(true);
    expect(hasBreakdown(holding({ currencyBreakdown: { fx: 100, ils: 0 } }), 'currency')).toEqual(true);
    expect(hasBreakdown(holding({ assetBreakdown: { equity: 100, solid: 0 } }), 'asset')).toEqual(true);
  });
});

describe('dominantKey()', () => {
  it('returns the key with the highest value', () => {
    expect(dominantKey({ fx: 70, ils: 30 })).toEqual('fx');
    expect(dominantKey({ equity: 40, solid: 60 })).toEqual('solid');
  });
});

describe('isValidBreakdown()', () => {
  it('returns true for values summing to 100', () => {
    expect(isValidBreakdown({ fx: 70, ils: 30 })).toEqual(true);
  });

  it('returns true within 0.5 tolerance', () => {
    expect(isValidBreakdown({ fx: 70.3, ils: 30 })).toEqual(true);
  });

  it('returns false for values not summing to 100', () => {
    expect(isValidBreakdown({ fx: 70, ils: 20 })).toEqual(false);
  });

  it('returns false for negative values', () => {
    expect(isValidBreakdown({ fx: -10, ils: 110 })).toEqual(false);
  });

  it('returns false for empty breakdown', () => {
    expect(isValidBreakdown({})).toEqual(false);
  });
});

describe('hasInvalidBreakdown()', () => {
  it('returns false when no breakdowns present', () => {
    expect(hasInvalidBreakdown(holding())).toEqual(false);
  });

  it('returns false for valid breakdowns', () => {
    expect(hasInvalidBreakdown(holding({ currencyBreakdown: { fx: 60, ils: 40 } }))).toEqual(false);
  });

  it('returns true for invalid breakdowns', () => {
    expect(hasInvalidBreakdown(holding({ currencyBreakdown: { fx: 60, ils: 20 } }))).toEqual(true);
  });
});
