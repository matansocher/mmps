import type { Country } from '../types';

export const countryLabel = (country: Country | undefined): string => (country ? `${country.flag} ${country.name}` : '');

export function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
