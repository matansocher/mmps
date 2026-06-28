export const CURRENCY_SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };

export function formatAmount(amount: number, currency: string): string {
  return `${CURRENCY_SYMBOLS[currency] ?? currency}${amount.toFixed(2)}`;
}
