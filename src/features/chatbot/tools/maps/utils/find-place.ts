import axios from 'axios';
import { env } from 'node:process';
import { geocodeAddress } from './geocode-address';

export type PlaceInfo = {
  lat: number | null;
  lng: number | null;
  name: string;
  formatted_address: string;
  place_id: string | null;
  types: string[];
  useCoordinates: boolean;
};

/**
 * Try to find a place using Google Places Text Search API
 */
async function tryTextSearchAPI(placeName: string): Promise<PlaceInfo | null> {
  const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName)}&key=${env.GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await axios.get(textSearchUrl);

    if (response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
      const place = response.data.results[0];
      return {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        name: place.name,
        formatted_address: place.formatted_address,
        place_id: place.place_id,
        types: place.types || [],
        useCoordinates: true,
      };
    }
  } catch {}

  return null;
}

async function tryFindPlaceAPI(placeName: string): Promise<PlaceInfo | null> {
  const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeName)}&inputtype=textquery&fields=geometry,name,formatted_address,place_id,types&key=${env.GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await axios.get(findPlaceUrl);

    if (response.data.status === 'OK' && response.data.candidates && response.data.candidates.length > 0) {
      const place = response.data.candidates[0];
      return {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        name: place.name,
        formatted_address: place.formatted_address,
        place_id: place.place_id,
        types: place.types || [],
        useCoordinates: true,
      };
    }
  } catch {}

  return null;
}

async function tryGeocodingAPI(placeName: string): Promise<PlaceInfo | null> {
  try {
    const geocodeResult = await geocodeAddress(placeName, env.GOOGLE_MAPS_API_KEY);

    const nameParts = geocodeResult.formatted_address.split(',');
    const extractedName = nameParts[0] || placeName;

    return {
      lat: geocodeResult.lat,
      lng: geocodeResult.lng,
      name: extractedName,
      formatted_address: geocodeResult.formatted_address,
      place_id: null,
      types: [],
      useCoordinates: true,
    };
  } catch {}

  return null;
}

export async function findPlace(placeName: string): Promise<PlaceInfo> {
  const textSearchResult = await tryTextSearchAPI(placeName);
  if (textSearchResult) {
    return textSearchResult;
  }

  const findPlaceResult = await tryFindPlaceAPI(placeName);
  if (findPlaceResult) {
    return findPlaceResult;
  }

  const geocodingResult = await tryGeocodingAPI(placeName);
  if (geocodingResult) {
    return geocodingResult;
  }

  return {
    lat: null,
    lng: null,
    name: placeName,
    formatted_address: placeName,
    place_id: null,
    types: [],
    useCoordinates: false,
  };
}
