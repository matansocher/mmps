import { sleep } from '@core/utils';
import { type AdsbAircraft, getAircraftInRadius } from '@services/adsb';
import { MAX_CALLSIGNS, REQUEST_GAP_MS } from './constants';
import { isPointInGeometry } from './geo';
import type { CountryGeometry, CountryTrafficSnapshot, MonitoredCountry } from './types';

function isAirborne(aircraft: AdsbAircraft): boolean {
  return typeof aircraft.lat === 'number' && typeof aircraft.lon === 'number' && aircraft.alt_baro !== 'ground';
}

// Any failed circle throws: a partial sample would undercount and look like a traffic drop.
export async function sampleCountryTraffic(country: MonitoredCountry, geometry: CountryGeometry, requestGapMs: number = REQUEST_GAP_MS): Promise<CountryTrafficSnapshot> {
  const aircraftByHex = new Map<string, AdsbAircraft>();
  for (const [index, circle] of country.circles.entries()) {
    if (index > 0 && requestGapMs > 0) {
      await sleep(requestGapMs);
    }
    const aircraft = await getAircraftInRadius(circle);
    aircraft.filter(isAirborne).forEach((item) => aircraftByHex.set(item.hex, item));
  }

  const inside = [...aircraftByHex.values()].filter(({ lat, lon }) => isPointInGeometry(lat, lon, geometry));
  const callsigns = inside
    .map(({ flight }) => flight?.trim())
    .filter(Boolean)
    .slice(0, MAX_CALLSIGNS);

  return { insideCount: inside.length, outsideCount: aircraftByHex.size - inside.length, callsigns };
}
