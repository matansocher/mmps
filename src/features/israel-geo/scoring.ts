import { ISRAEL_GEO_CONFIG } from './israel-geo.config';
import type { Coordinates } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceBetween(a: Coordinates, b: Coordinates): number {
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lng - a.lng);
  const latitudeA = toRadians(a.lat);
  const latitudeB = toRadians(b.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export type CircleScore = {
  readonly points: number;
  readonly circleHit: boolean;
  readonly outsideDistanceMeters: number;
};

export function maximumCircleScore(radiusKm: number): number {
  const normalizedRadius = Math.max(ISRAEL_GEO_CONFIG.minCircleRadiusKm, Math.min(ISRAEL_GEO_CONFIG.maxCircleRadiusKm, radiusKm));
  const score = 5_000 * Math.exp(-(normalizedRadius - ISRAEL_GEO_CONFIG.minCircleRadiusKm) / ISRAEL_GEO_CONFIG.circleScoreDecayKm);
  return Math.max(0, Math.min(5_000, Math.round(score)));
}

export function scoreCircle(distanceMeters: number, radiusKm: number): CircleScore {
  const radiusMeters = radiusKm * 1_000;
  const circleHit = distanceMeters <= radiusMeters;
  const outsideDistanceMeters = Math.max(0, Math.round(distanceMeters - radiusMeters));
  const maximumScore = maximumCircleScore(radiusKm);
  if (circleHit) return { points: maximumScore, circleHit, outsideDistanceMeters };

  const missScore = maximumScore * ISRAEL_GEO_CONFIG.missedCircleScoreMultiplier * Math.exp(-(outsideDistanceMeters / 1_000) / ISRAEL_GEO_CONFIG.missedCircleDecayKm);
  return { points: Math.max(0, Math.min(5_000, Math.round(missScore))), circleHit, outsideDistanceMeters };
}
