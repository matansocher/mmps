import { ISRAEL_RADIUS_KM, JERUSALEM_COORDS, MIN_MAGNITUDE_GLOBAL, MIN_MAGNITUDE_NEARBY } from '../constants';
import type { Earthquake } from '../types';
import { calculateDistance } from './calculate-distance';

export function shouldNotifyEarthquake(earthquake: Earthquake): boolean {
  const magnitude = earthquake.properties.mag;
  const [longitude, latitude] = earthquake.geometry.coordinates;

  if (magnitude >= MIN_MAGNITUDE_GLOBAL) {
    return true;
  }

  if (magnitude >= MIN_MAGNITUDE_NEARBY) {
    const distance = calculateDistance(JERUSALEM_COORDS.latitude, JERUSALEM_COORDS.longitude, latitude, longitude);
    if (distance <= ISRAEL_RADIUS_KM) {
      return true;
    }
  }

  return false;
}
