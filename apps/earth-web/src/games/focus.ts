import { countryFocus } from '../game/countries';
import { flyToArea } from '../globe/camera';
import type { EarthEngine } from '../globe/engine';

export function focusCountry({ viewer, countries }: EarthEngine, code: string): void {
  const country = countries.byCode.get(code);
  if (!country) return;
  const { lat, lon, spanKm } = countryFocus(country);
  void flyToArea(viewer, lat, lon, spanKm);
}
