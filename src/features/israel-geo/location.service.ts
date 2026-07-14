import axios from 'axios';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { ISRAEL_GEO_CONFIG, SEARCH_REGIONS } from './israel-geo.config';
import { distanceBetween } from './scoring';
import type { Coordinates, GameLocation, SearchRegion } from './types';

type StreetViewMetadataResponse = {
  readonly status: string;
  readonly error_message?: string;
  readonly pano_id?: string;
  readonly location?: Coordinates;
};

const logger = new Logger('IsraelGeoLocationService');

class GoogleMapsApiError extends Error {}

function apiKey(): string {
  const key = env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is required for Israel Geo');
  return key;
}

function selectWeightedRegion(): SearchRegion {
  const totalWeight = SEARCH_REGIONS.reduce((total, region) => total + region.weight, 0);
  let selection = Math.random() * totalWeight;
  for (const region of SEARCH_REGIONS) {
    selection -= region.weight;
    if (selection <= 0) return region;
  }
  return SEARCH_REGIONS[SEARCH_REGIONS.length - 1];
}

function randomPointAround(region: SearchRegion): Coordinates {
  const distanceKm = Math.sqrt(Math.random()) * region.radiusKm;
  const bearing = Math.random() * Math.PI * 2;
  const latitudeOffset = (distanceKm * Math.cos(bearing)) / 111.32;
  const longitudeScale = Math.max(0.2, Math.cos((region.center.lat * Math.PI) / 180));
  const longitudeOffset = (distanceKm * Math.sin(bearing)) / (111.32 * longitudeScale);
  return { lat: region.center.lat + latitudeOffset, lng: region.center.lng + longitudeOffset };
}

async function findPanorama(coordinates: Coordinates, key: string): Promise<{ panoramaId: string; coordinates: Coordinates } | null> {
  const response = await axios.get<StreetViewMetadataResponse>('https://maps.googleapis.com/maps/api/streetview/metadata', {
    params: {
      location: `${coordinates.lat},${coordinates.lng}`,
      radius: ISRAEL_GEO_CONFIG.panoramaSearchRadiusMeters,
      source: 'outdoor',
      key,
    },
  });
  if (response.data.status === 'ZERO_RESULTS') return null;
  if (response.data.status !== 'OK') throw new GoogleMapsApiError(`Street View metadata failed: ${response.data.status} - ${response.data.error_message ?? 'no details'}`);
  if (!response.data.pano_id || !response.data.location) return null;
  return { panoramaId: response.data.pano_id, coordinates: response.data.location };
}

function isDuplicate(candidate: Coordinates, existing: readonly GameLocation[]): boolean {
  return existing.some((location) => distanceBetween(candidate, location.coordinates) < ISRAEL_GEO_CONFIG.duplicateDistanceMeters);
}

export async function createGameLocations(count = 1, excludedLocations: readonly GameLocation[] = []): Promise<readonly GameLocation[]> {
  const key = apiKey();
  const locations: GameLocation[] = [];
  let attempts = 0;
  const maxAttempts = count * ISRAEL_GEO_CONFIG.maxLocationAttemptsPerRound;

  while (locations.length < count && attempts < maxAttempts) {
    attempts += 1;
    const region = selectWeightedRegion();
    try {
      const panorama = await findPanorama(randomPointAround(region), key);
      if (!panorama || isDuplicate(panorama.coordinates, [...excludedLocations, ...locations])) continue;
      locations.push({ panoramaId: panorama.panoramaId, coordinates: panorama.coordinates, locality: region.name });
    } catch (err) {
      if (err instanceof GoogleMapsApiError) throw err;
      logger.warn(`Location attempt ${attempts} failed: ${err}`);
    }
  }

  if (locations.length !== count) throw new Error(`Could only generate ${locations.length} of ${count} Israel Geo locations`);
  return locations;
}

export async function createLocationForRegion(region: SearchRegion, excludedLocations: readonly GameLocation[] = []): Promise<GameLocation> {
  const key = apiKey();
  for (let attempt = 1; attempt <= ISRAEL_GEO_CONFIG.maxLocationAttemptsPerRound; attempt += 1) {
    try {
      const panorama = await findPanorama(randomPointAround(region), key);
      if (!panorama || isDuplicate(panorama.coordinates, excludedLocations)) continue;
      return { panoramaId: panorama.panoramaId, coordinates: panorama.coordinates, locality: region.name };
    } catch (err) {
      if (err instanceof GoogleMapsApiError) throw err;
      logger.warn(`Location attempt ${attempt} for ${region.name} failed: ${err}`);
    }
  }
  throw new Error(`Could not generate an Israel Geo location for ${region.name}`);
}
