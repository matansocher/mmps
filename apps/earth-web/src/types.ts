export type LatLon = {
  readonly lat: number;
  readonly lon: number;
};

export type CameraView = LatLon & {
  readonly altitude: number; // meters above ellipsoid
  readonly heading: number; // degrees, 0 = north
  readonly pitch: number; // degrees, -90 = straight down
};

export type Ring = readonly number[]; // Format: [lon, lat, lon, lat, ...], open (no repeated closing point)

export type Polygon = readonly Ring[]; // First ring is the outline, the rest are holes

export type Country = {
  readonly code: string; // ISO 3166-1 alpha-2
  readonly name: string;
  readonly flag: string;
  readonly continent: string;
  readonly area: number; // km²
  readonly neighbours: readonly string[]; // Codes of countries sharing a land border
  readonly polygons: readonly Polygon[];
};
