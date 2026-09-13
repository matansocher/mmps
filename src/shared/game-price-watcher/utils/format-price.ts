const MINOR_UNITS_PER_MAJOR = 100;

// Store prices arrive in minor units (2800 = 28.00), so they are rendered back to a major amount.
export function formatPrice(minorUnits: number, currency: string): string {
  const amount = (minorUnits / MINOR_UNITS_PER_MAJOR).toFixed(2);
  return currency ? `${currency} ${amount}` : amount;
}

export function calculateDiscountPercent(basePrice: number, currentPrice: number): number {
  if (basePrice <= 0 || currentPrice >= basePrice) {
    return 0;
  }
  return Math.round(((basePrice - currentPrice) / basePrice) * 100);
}
