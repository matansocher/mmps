import type { Country } from '../types';

export const countryLabel = (country: Country | undefined): string => (country ? `${country.flag} ${country.name}` : '');
