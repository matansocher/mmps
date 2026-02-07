import axios from 'axios';
import type { BoundingBox, FlightState } from './types';

const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all';

export async function getFlightsInBoundingBox(bounds: BoundingBox): Promise<FlightState[]> {
  const { lamin, lomin, lamax, lomax } = bounds;
  const response = await axios.get(OPENSKY_API_URL, { params: { lamin, lomin, lamax, lomax } });

  const states: unknown[][] | null = response.data.states;
  if (!states) {
    return [];
  }

  return states
    .filter((s) => s[5] != null && s[6] != null)
    .map((s) => ({
      icao24: s[0] as string,
      callsign: ((s[1] as string) || '').trim(),
      originCountry: s[2] as string,
      longitude: s[5] as number,
      latitude: s[6] as number,
      altitude: s[7] as number | null,
      onGround: s[8] as boolean,
      velocity: s[9] as number | null,
    }));
}
