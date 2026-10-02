import type { LatLon, PlaceTarget, SearchResult } from '../types';
import { recordAutocomplete, recordPlaceDetails } from './usage';

const BASE = 'https://places.googleapis.com/v1';

type AutocompleteResponse = {
  readonly suggestions?: ReadonlyArray<{
    readonly placePrediction?: {
      readonly placeId: string;
      readonly text?: { readonly text: string };
      readonly structuredFormat?: { readonly mainText?: { readonly text: string }; readonly secondaryText?: { readonly text: string } };
    };
  }>;
};

type GoogleLatLng = { readonly latitude: number; readonly longitude: number };

type PlaceDetailsResponse = {
  readonly displayName?: { readonly text: string };
  readonly formattedAddress?: string;
  readonly location: GoogleLatLng;
  readonly viewport?: { readonly low: GoogleLatLng; readonly high: GoogleLatLng };
};

const toLatLon = (p: GoogleLatLng): LatLon => ({ lat: p.latitude, lon: p.longitude });

export async function autocompletePlaces(key: string, input: string, sessionToken: string, signal: AbortSignal, bias?: LatLon): Promise<SearchResult[]> {
  const body: Record<string, unknown> = { input, sessionToken };
  if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lon }, radius: 50_000 } };
  recordAutocomplete(sessionToken);
  const response = await fetch(`${BASE}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  const data = (await response.json()) as AutocompleteResponse;
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.placeId,
      primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
      kind: 'place' as const,
    }));
}

export async function getPlaceDetails(key: string, placeId: string, sessionToken: string): Promise<PlaceTarget> {
  const url = `${BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`;
  recordPlaceDetails(sessionToken);
  const response = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'displayName,formattedAddress,location,viewport' },
  });
  if (!response.ok) throw new Error(`Place lookup failed (${response.status})`);
  const data = (await response.json()) as PlaceDetailsResponse;
  return {
    ...toLatLon(data.location),
    name: data.displayName?.text ?? 'Place',
    address: data.formattedAddress,
    viewport: data.viewport ? { low: toLatLon(data.viewport.low), high: toLatLon(data.viewport.high) } : undefined,
  };
}
