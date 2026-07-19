import { parseSaveSavingsPortfolioBody } from './dto';

const validBody = {
  revision: 0,
  settings: {
    depositAmountIls: 5_000,
    fxLimitPercent: 45,
    solidTargetPercent: 20,
    geographyTargets: { 'ארהב': 60, 'ישראל': 40 },
  },
  holdings: [
    {
      id: 'holding-1',
      account: 'manual',
      name: 'S&P 500',
      category: 'מדד אמריקאי',
      geography: 'ארהב',
      currentAmountIls: 10_000,
      targetAmountIls: 15_000,
      currencyExposure: 'fx',
      assetType: 'equity',
      owner: 'shared',
      note: '',
    },
  ],
};

describe('parseSaveSavingsPortfolioBody()', () => {
  it('should accept a valid portfolio', () => {
    expect(parseSaveSavingsPortfolioBody(validBody)).toEqual(validBody);
  });

  it('should reject duplicate holding ids', () => {
    expect(parseSaveSavingsPortfolioBody({ ...validBody, holdings: [...validBody.holdings, validBody.holdings[0]] })).toEqual(null);
  });

  it('should reject negative monetary values', () => {
    expect(
      parseSaveSavingsPortfolioBody({
        ...validBody,
        holdings: [{ ...validBody.holdings[0], currentAmountIls: -1 }],
      }),
    ).toEqual(null);
  });

  it('should reject invalid strategy percentages', () => {
    expect(
      parseSaveSavingsPortfolioBody({
        ...validBody,
        settings: { ...validBody.settings, fxLimitPercent: 101 },
      }),
    ).toEqual(null);
  });

  it('should trim holding text fields before saving', () => {
    const parsed = parseSaveSavingsPortfolioBody({
      ...validBody,
      holdings: [{ ...validBody.holdings[0], name: '  S&P 500  ', note: '  long term  ' }],
    });

    expect(parsed?.holdings[0].name).toEqual('S&P 500');
    expect(parsed?.holdings[0].note).toEqual('long term');
  });
});
