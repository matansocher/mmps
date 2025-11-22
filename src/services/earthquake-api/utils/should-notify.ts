import { Earthquake } from '../types';

// Jerusalem coordinates for proximity checking
const JERUSALEM_COORDS = {
  latitude: 31.7683,
  longitude: 35.2137,
} as const;

const ISRAEL_PROXIMITY_KM = 1000;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function shouldNotifyAboutEarthquake(quake: Earthquake): boolean {
  const magnitude = quake.properties.mag;
  const [longitude, latitude] = quake.geometry.coordinates;

  if (magnitude > 6) {
    return true;
  }

  const distanceFromJerusalem = calculateDistance(JERUSALEM_COORDS.latitude, JERUSALEM_COORDS.longitude, latitude, longitude);
  return distanceFromJerusalem <= ISRAEL_PROXIMITY_KM;
}
