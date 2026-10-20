export const GTFS_URL = 'https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip';

// In the MOT GTFS feed the Red Line (Dan region light rail) is operated by agency 22 ("תבל"), as tram routes.
export const RED_LINE_AGENCY_ID = '22';
export const TRAM_ROUTE_TYPE = '0';

// The feed is republished daily, so the parsed timetable is rebuilt once a day.
export const TIMETABLE_REFRESH_MS = 24 * 60 * 60 * 1000;
export const TIMETABLE_CACHE_MINUTES = 36 * 60;

// Normalized Hebrew GTFS stop name -> extra names users may type.
export const LIGHT_RAIL_STATION_ALIASES: Record<string, readonly string[]> = {
  'תחנה מרכזית פתח תקווה': ['פתח תקווה', 'פתח תקוה', 'מרכזית פתח תקווה', 'petah tikva', 'petah tikva central', 'petach tikva'],
  'קרית אריה': ['קריית אריה', 'kiryat arye', 'kiryat aryeh', 'kiryat arie'],
  'גשר אם המושבות': ['אם המושבות', 'em hamoshavot'],
  'אצטדיון בלומפילד': ['בלומפילד', 'bloomfield'],
  זבוטינסקי: ['jabotinsky', 'זבו'],
  הקוממיות: ['קוממיות', 'komemiyut', 'bat yam'],
  'כט בנובמבר': ['כ״ט בנובמבר', 'kaf tet benovember', '29 november', '29 בנובמבר'],
  הבעשט: ['habesht', 'baal shem tov'],
  'שאול המלך': ['shaul hamelech', 'shaul hamelekh'],
  יוספטל: ['yoseftal'],
  ארליך: ['erlich'],
  איסקוב: ['iskov'],
};

export const NEARBY_CANDIDATES = 3;
export const NEARBY_CACHE_MINUTES = 24 * 60;
// Used when the walking-route lookup is unavailable: streets are ~30% longer than a straight line, walking speed ~80 m/min.
export const WALKING_DETOUR_FACTOR = 1.3;
export const WALKING_METERS_PER_MINUTE = 80;
export const ROUTE_MATRIX_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
export const ROUTE_MATRIX_TIMEOUT_MS = 8000;
