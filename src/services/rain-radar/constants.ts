import type { GeoBounds, RadarSource, RadarView } from './types';

export const IMS_BASE_URL = 'https://ims.gov.il';
export const IMS_RADAR_METADATA_ENDPOINT = '/he/radar_satellite';
export const IMS_TILE_URL = (zoom: number, x: number, y: number) => `${IMS_BASE_URL}/sites/default/files/mapa/he/${zoom}/${x}/${y}.png`;
export const IMS_RADAR_PAGE_URL = 'https://ims.gov.il/he/RadarSatellite';
export const IMS_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// Image bounds taken from IMS's Leaflet code (set_satellite_radar_on_map in ims_tools.js)
export const RADAR_BOUNDS: Record<RadarSource, GeoBounds> = {
  IMSRadar: { south: 29.4468656950938161, west: 31.7662931774178858, north: 34.5318966003582659, east: 37.864813247553009 },
  radar: { south: 29.4373462909, west: 31.9347389087, north: 34.5078463729, east: 37.8574239563 },
};

// Minutes between consecutive frames of each source
export const RADAR_FRAME_INTERVAL_MINUTES: Record<RadarSource, number> = {
  IMSRadar: 5,
  radar: 10,
};

// Central Israel with ~100km of sea to the west, where most rain systems arrive from
export const DEFAULT_VIEW: RadarView = {
  center: { lat: 32.08, lon: 34.6 },
  zoom: 9,
  width: 800,
  height: 800,
};

export const DEFAULT_ANIMATION_MINUTES = 60;
export const FRAME_DELAY_MS = 450;
export const LAST_FRAME_DELAY_MS = 2000;

export const TILE_SIZE = 256;
export const RADAR_OPACITY = 0.7; // same as the IMS website

export const LABEL_FONT_PATH = 'assets/fonts/NotoSansHebrew-Bold.ttf';
