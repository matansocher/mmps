/**
 * IMS API Configuration
 */
export const IMS_RADAR_CONFIG = {
  baseUrl: 'https://ims.gov.il',
  endpoint: '/en/radar_satellite',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
} as const;

/**
 * IMS Radar Reference Configuration
 * Determined through visual calibration - the IMS radar image (940x940)
 * corresponds to a Web Mercator projection centered at these coordinates.
 */
export const IMS_RADAR_REF = {
  centerLat: 31.5,
  centerLon: 35.2,
  zoom: 8,
  width: 940,
  height: 940,
} as const;

/**
 * Default view configuration - Israel Central District (Haifa to Beer Sheva)
 */
export const DEFAULT_VIEW = {
  centerLat: 32.02,
  centerLon: 34.85,
  zoom: 9,
  width: 700,
  height: 900,
} as const;

/**
 * Web Mercator tile size (standard)
 */
export const TILE_SIZE = 256;
