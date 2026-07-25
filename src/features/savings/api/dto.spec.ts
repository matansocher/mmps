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

  it('should accept a holding with valid breakdowns', () => {
    const parsed = parseSaveSavingsPortfolioBody({
      ...validBody,
      holdings: [
        {
          ...validBody.holdings[0],
          geographyBreakdown: { 'ארהב': 60, 'אירופה': 40 },
          currencyBreakdown: { fx: 70, ils: 30 },
          assetBreakdown: { equity: 80, solid: 20 },
        },
      ],
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.holdings[0].geographyBreakdown).toEqual({ 'ארהב': 60, 'אירופה': 40 });
    expect(parsed?.holdings[0].currencyBreakdown).toEqual({ fx: 70, ils: 30 });
    expect(parsed?.holdings[0].assetBreakdown).toEqual({ equity: 80, solid: 20 });
  });

  it('should accept a holding without breakdowns (backward compat)', () => {
    const parsed = parseSaveSavingsPortfolioBody(validBody);
    expect(parsed).not.toBeNull();
    expect(parsed?.holdings[0].geographyBreakdown).toBeUndefined();
    expect(parsed?.holdings[0].currencyBreakdown).toBeUndefined();
    expect(parsed?.holdings[0].assetBreakdown).toBeUndefined();
  });

  it('should reject a holding with breakdown not summing to 100', () => {
    expect(
      parseSaveSavingsPortfolioBody({
        ...validBody,
        holdings: [{ ...validBody.holdings[0], currencyBreakdown: { fx: 60, ils: 20 } }],
      }),
    ).toEqual(null);
  });

  it('should reject a holding with unknown breakdown keys', () => {
    expect(
      parseSaveSavingsPortfolioBody({
        ...validBody,
        holdings: [{ ...validBody.holdings[0], currencyBreakdown: { fx: 50, usd: 50 } }],
      }),
    ).toEqual(null);
  });
});
