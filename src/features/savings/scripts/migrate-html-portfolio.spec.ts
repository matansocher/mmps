import { describe, expect, it } from 'vitest';
import { parseHtmlPortfolio } from './migrate-html-portfolio';

describe('parseHtmlPortfolio()', () => {
  it('parses the original holdings array from a raw calculator HTML export', () => {
    const html = `
      <input id="fxLimitInput" value="45">
      <input id="solidTargetInput" value="20">
      <script>
        const originalHoldings = [
          { id: "acwi", account: "managed", name: "MSCI ACWI", category: "Equity", geography: "World", target: 12, currency: "fx", type: "equity" },
          { id: "bonds", account: "managed", name: "Government Bonds", category: "Bonds", geography: "Israel", target: 30, currency: "ils", type: "solid" }
        ];
      </script>
    `;

    const result = parseHtmlPortfolio(html);

    expect(result.source).toEqual('original_holdings');
    expect(result.holdings).toHaveLength(2);
    expect(result.holdings.every((holding) => holding.currentAmountIls === 0)).toEqual(true);
    expect(result.holdings.find((holding) => holding.id === 'acwi')).toEqual(
      expect.objectContaining({
        name: 'MSCI ACWI',
        targetAmountIls: 12,
        currencyExposure: 'fx',
        assetType: 'equity',
      }),
    );
    expect(result.settings).toEqual({
      depositAmountIls: 0,
      fxLimitPercent: 45,
      solidTargetPercent: 20,
      geographyTargets: {},
    });
  });

  it('prefers holdings and settings embedded in an exported HTML file', () => {
    const html = `
      <input id="fxLimitInput" value="45">
      <input id="solidTargetInput" value="20">
      <script id="savedState" type="application/json">
        {
          "settings": { "fxLimit": "35", "solidTarget": "25" },
          "holdings": [
            {
              "id": "custom",
              "account": "manual",
              "name": "Custom Fund",
              "category": "Global",
              "geography": "World",
              "current": 72,
              "target": 40,
              "currency": "fx",
              "type": "solid",
              "note": "Imported"
            }
          ]
        }
      </script>
      <script>const originalHoldings = [];</script>
    `;

    const result = parseHtmlPortfolio(html);

    expect(result.source).toEqual('saved_state');
    expect(result.settings.fxLimitPercent).toEqual(35);
    expect(result.settings.solidTargetPercent).toEqual(25);
    expect(result.holdings).toEqual([
      {
        id: 'custom',
        account: 'manual',
        name: 'Custom Fund',
        category: 'Global',
        geography: 'World',
        currentAmountIls: 0,
        targetAmountIls: 40,
        currencyExposure: 'fx',
        assetType: 'solid',
        owner: 'shared',
        note: 'Imported',
      },
    ]);
  });

  it('rejects duplicate holding IDs', () => {
    const html = `
      <script id="savedState" type="application/json">
        {
          "holdings": [
            { "id": "same", "name": "One", "target": 50 },
            { "id": "same", "name": "Two", "target": 50 }
          ]
        }
      </script>
    `;

    expect(() => parseHtmlPortfolio(html)).toThrow('duplicate holding IDs');
  });
});
