import type { LatLon } from '../types';

const COMPONENT = String.raw`([NSEWnsew])?\s*([-+]?\d+(?:\.\d+)?)\s*°?\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:"|″|'')\s*)?([NSEWnsew])?`;
const PAIR = new RegExp(String.raw`^\s*${COMPONENT}\s*(?:[,;]\s*|\s+)${COMPONENT}\s*$`);

type Component = { readonly value: number; readonly hemisphere?: string };

function toComponent(prefix: string | undefined, deg: string, min: string | undefined, sec: string | undefined, suffix: string | undefined): Component | null {
  if (prefix && suffix) return null;
  const degrees = Number(deg);
  const minutes = min ? Number(min) : 0;
  const seconds = sec ? Number(sec) : 0;
  if (minutes >= 60 || seconds >= 60) return null;
  const sign = degrees < 0 || deg.startsWith('-') ? -1 : 1;
  const hemisphere = (prefix || suffix)?.toUpperCase();
  let value = sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
  if (hemisphere === 'S' || hemisphere === 'W') value = -Math.abs(value);
  return { value, hemisphere };
}

export function parseCoordinates(input: string): LatLon | null {
  const match = PAIR.exec(input.replace(/º/g, '°'));
  if (!match) return null;
  const first = toComponent(match[1], match[2], match[3], match[4], match[5]);
  const second = toComponent(match[6], match[7], match[8], match[9], match[10]);
  if (!first || !second) return null;

  const isLon = (c: Component) => c.hemisphere === 'E' || c.hemisphere === 'W';
  const isLat = (c: Component) => c.hemisphere === 'N' || c.hemisphere === 'S';
  if ((isLon(first) && isLon(second)) || (isLat(first) && isLat(second))) return null;
  const [lat, lon] = isLon(first) || isLat(second) ? [second.value, first.value] : [first.value, second.value];

  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function toDms(value: number, positive: string, negative: string): string {
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Math.floor((abs - degrees) * 60);
  let seconds = Math.round(((abs - degrees) * 60 - minutes) * 60 * 10) / 10;
  if (seconds >= 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes = 0;
    degrees += 1;
  }
  return `${degrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"${value < 0 ? negative : positive}`;
}

export function formatLatLonDms({ lat, lon }: LatLon): string {
  return `${toDms(lat, 'N', 'S')} ${toDms(lon, 'E', 'W')}`;
}

export function formatLatLonDecimal({ lat, lon }: LatLon, digits = 6): string {
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`;
}
