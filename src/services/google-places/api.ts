import axios from 'axios';
import { env } from 'node:process';
import { DEFAULT_MAX_RESULTS, DEFAULT_REGION_CODE, DETAILS_FIELD_MASK, MAX_RESULTS_LIMIT, PLACES_BASE_URL, REQUEST_TIMEOUT_MS, SEARCH_FIELD_MASK } from './constants';
import type { Place, PlaceDetails, PlacesApiPlace, PlacesSearchResponse, SearchPlacesOptions } from './types';

function getApiKey(): string {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }
  return apiKey;
}

export function buildMapsUrl(placeId: string, name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`;
}

function toPlace(place: PlacesApiPlace): Place {
  const name = place.displayName?.text || place.formattedAddress || place.id;
  return {
    placeId: place.id,
    name,
    address: place.formattedAddress,
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    type: place.primaryTypeDisplayName?.text,
    rating: place.rating,
    ratingCount: place.userRatingCount,
    businessStatus: place.businessStatus,
    mapsUrl: place.googleMapsUri || buildMapsUrl(place.id, name),
  };
}

export async function searchPlaces(query: string, options: SearchPlacesOptions = {}): Promise<Place[]> {
  const { maxResults = DEFAULT_MAX_RESULTS, languageCode, regionCode = DEFAULT_REGION_CODE } = options;
  const { data } = await axios.post<PlacesSearchResponse>(
    `${PLACES_BASE_URL}/places:searchText`,
    { textQuery: query, pageSize: Math.min(Math.max(maxResults, 1), MAX_RESULTS_LIMIT), regionCode, ...(languageCode && { languageCode }) },
    { headers: { 'X-Goog-Api-Key': getApiKey(), 'X-Goog-FieldMask': SEARCH_FIELD_MASK }, timeout: REQUEST_TIMEOUT_MS },
  );
  return (data?.places ?? []).map(toPlace);
}

export async function getPlaceDetails(placeId: string, languageCode?: string): Promise<PlaceDetails> {
  const { data } = await axios.get<PlacesApiPlace>(`${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': getApiKey(), 'X-Goog-FieldMask': DETAILS_FIELD_MASK },
    params: languageCode ? { languageCode } : undefined,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return {
    ...toPlace(data),
    phone: data.internationalPhoneNumber || data.nationalPhoneNumber,
    website: data.websiteUri,
    priceLevel: data.priceLevel,
    openNow: data.regularOpeningHours?.openNow,
    openingHours: data.regularOpeningHours?.weekdayDescriptions,
  };
}
