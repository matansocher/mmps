export type ParsedPrices = {
  readonly yesPrice: number;
  readonly noPrice: number;
};

export function parseOutcomePrices(outcomePricesStr: string): ParsedPrices {
  try {
    const prices = JSON.parse(outcomePricesStr) as string[];
    return {
      yesPrice: parseFloat(prices[0]) || 0,
      noPrice: parseFloat(prices[1]) || 0,
    };
  } catch {
    return { yesPrice: 0, noPrice: 0 };
  }
}
