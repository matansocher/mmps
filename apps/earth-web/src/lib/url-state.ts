import type { CameraView } from '../types';

// Google-Earth-style camera hash: #@lat,lon,{altitude}a,{heading}h,{tilt}t (tilt 0 = looking straight down).
const HASH = /^#?@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)a(?:,(-?\d+(?:\.\d+)?)h)?(?:,(\d+(?:\.\d+)?)t)?$/;

const normalizeHeading = (deg: number) => ((deg % 360) + 360) % 360;

export function encodeView(view: CameraView): string {
  const tilt = Math.min(90, Math.max(0, view.pitch + 90));
  return `@${view.lat.toFixed(6)},${view.lon.toFixed(6)},${Math.round(view.altitude)}a,${normalizeHeading(view.heading).toFixed(1)}h,${tilt.toFixed(1)}t`;
}

export function decodeView(hash: string): CameraView | null {
  const match = HASH.exec(hash.trim());
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  const altitude = Number(match[3]);
  const heading = match[4] ? normalizeHeading(Number(match[4])) : 0;
  const tilt = match[5] ? Number(match[5]) : 0;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || altitude <= 0 || altitude > 100_000_000 || tilt > 90) return null;
  return { lat, lon, altitude, heading, pitch: tilt - 90 };
}
