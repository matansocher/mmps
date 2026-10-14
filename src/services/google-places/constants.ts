export const PLACES_BASE_URL = 'https://places.googleapis.com/v1';
export const REQUEST_TIMEOUT_MS = 15_000;
export const DEFAULT_REGION_CODE = 'IL';
export const DEFAULT_MAX_RESULTS = 5;
export const MAX_RESULTS_LIMIT = 20;

export const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
].join(',');

export const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'primaryTypeDisplayName',
  'businessStatus',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'priceLevel',
  'regularOpeningHours.weekdayDescriptions',
  'regularOpeningHours.openNow',
].join(',');
