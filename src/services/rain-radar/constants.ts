export const IMS_RADAR_CONFIG = {
  baseUrl: 'https://ims.gov.il',
  endpoint: '/en/radar_satellite',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
} as const;

// Exact radar image bounds from IMS Leaflet source: L.imageOverlay(url, [[29.3, 34], [33.5, 36]])
export const RADAR_BOUNDS = {
  south: 29.3,
  west: 34.0,
  north: 33.5,
  east: 36.0,
} as const;

export const DEFAULT_VIEW = {
  zoom: 9,
  width: 700,
  height: 900,
} as const;

export const TILE_SIZE = 256;

export const RADAR_OPACITY = 0.7;