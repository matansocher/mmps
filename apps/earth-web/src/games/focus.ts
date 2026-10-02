import { countryFocus, regionFocus } from '../game/countries';
import { flyToArea } from '../globe/camera';
import type { EarthEngine } from '../globe/engine';
import type { Country } from '../types';

export function focusCountry({ viewer, countries }: EarthEngine, code: string): void {
  const country = countries.byCode.get(code);
  if (!country) return;
  const { lat, lon, spanKm } = countryFocus(country);
  void flyToArea(viewer, lat, lon, spanKm);
}

export function focusRegion({ viewer, countries }: EarthEngine, codes: readonly string[]): void {
  const region = codes.map((code) => countries.byCode.get(code)).filter((country): country is Country => !!country);
  if (!region.length) return;
  const { lat, lon, spanKm } = regionFocus(region);
  void flyToArea(viewer, lat, lon, spanKm);
}
