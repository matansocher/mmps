import type { MonitoredCountry } from './types';

const RADIUS_NM = 250;

export const MONITORED_COUNTRIES: ReadonlyArray<MonitoredCountry> = [
  {
    alpha2: 'IL',
    name: 'Israel',
    emoji: '🇮🇱',
    mapCenter: { lat: 31.4, lon: 35.0, zoom: 7 },
    circles: [{ lat: 31.4, lon: 35.0, radiusNm: RADIUS_NM }],
  },
  {
    alpha2: 'IR',
    name: 'Iran',
    emoji: '🇮🇷',
    mapCenter: { lat: 32.4, lon: 53.7, zoom: 5 },
    circles: [
      { lat: 33.5, lon: 55.75, radiusNm: RADIUS_NM },
      { lat: 35, lon: 48, radiusNm: RADIUS_NM },
      { lat: 28.25, lon: 58.25, radiusNm: RADIUS_NM },
      { lat: 28.25, lon: 50.75, radiusNm: RADIUS_NM },
      { lat: 34.5, lon: 58, radiusNm: RADIUS_NM },
      { lat: 37.25, lon: 48.25, radiusNm: RADIUS_NM },
      { lat: 27.75, lon: 60, radiusNm: RADIUS_NM },
      { lat: 34, lon: 55.5, radiusNm: RADIUS_NM },
    ],
  },
];

export const LOOKBACK_DAYS = 14;
export const MIN_SAMPLES = 7; // same-hour samples needed before alerting
export const MIN_BASELINE = 8; // hours with a lower typical count are too quiet to judge
export const LOW_RATIO = 0.25; // enter low state at or below this share of the baseline
export const RECOVER_RATIO = 0.5; // leave low state at or above this share of the baseline
export const NEIGHBOUR_NORMAL_RATIO = 0.5;
export const MAX_CALLSIGNS = 5;
export const REQUEST_GAP_MS = 5000; // adsb.lol returns 429 on sustained calls faster than this
