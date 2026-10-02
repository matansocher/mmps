import type { Units } from '../types';

const M_PER_FT = 0.3048;
const M_PER_MI = 1609.344;
const M2_PER_ACRE = 4046.8564224;

const nf = (value: number, digits: number) => value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

function precision(value: number): number {
  if (value < 10) return 2;
  if (value < 100) return 1;
  return 0;
}

export function formatDistance(meters: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const miles = meters / M_PER_MI;
    if (miles < 0.1) return `${nf(meters / M_PER_FT, 0)} ft`;
    return `${nf(miles, precision(miles))} mi`;
  }
  if (meters < 1000) return `${nf(meters, meters < 10 ? 1 : 0)} m`;
  const km = meters / 1000;
  return `${nf(km, precision(km))} km`;
}

export function formatArea(squareMeters: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const acres = squareMeters / M2_PER_ACRE;
    if (acres < 1) return `${nf(squareMeters / (M_PER_FT * M_PER_FT), 0)} ft²`;
    if (acres < 640) return `${nf(acres, precision(acres))} ac`;
    const sqMi = squareMeters / (M_PER_MI * M_PER_MI);
    return `${nf(sqMi, precision(sqMi))} mi²`;
  }
  if (squareMeters < 10_000) return `${nf(squareMeters, 0)} m²`;
  if (squareMeters < 1_000_000) return `${nf(squareMeters / 10_000, 2)} ha`;
  const km2 = squareMeters / 1_000_000;
  return `${nf(km2, precision(km2))} km²`;
}

export function formatAltitude(meters: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const feet = meters / M_PER_FT;
    return feet < 10_000 ? `${nf(feet, 0)} ft` : `${nf(meters / M_PER_MI, 0)} mi`;
  }
  return meters < 10_000 ? `${nf(meters, 0)} m` : `${nf(meters / 1000, 0)} km`;
}

// Largest "nice" length (1/2/5 × 10^n) that fits in maxPx at the given scale.
export function niceScale(metersPerPixel: number, maxPx: number, units: Units = 'metric'): { readonly label: string; readonly px: number } | null {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return null;
  const unitMeters = units === 'imperial' ? M_PER_FT : 1;
  const maxUnits = (metersPerPixel * maxPx) / unitMeters;
  const exponent = Math.floor(Math.log10(maxUnits));
  const base = 10 ** exponent;
  const nice = [5, 2, 1].map((m) => m * base).find((v) => v <= maxUnits) ?? base;
  const meters = nice * unitMeters;
  return { label: formatDistance(meters, units), px: Math.round(meters / metersPerPixel) };
}
