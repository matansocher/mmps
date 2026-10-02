export type LatLon = {
  readonly lat: number;
  readonly lon: number;
};

export type CameraView = LatLon & {
  readonly altitude: number; // meters above ellipsoid
  readonly heading: number; // degrees, 0 = north
  readonly pitch: number; // degrees, -90 = straight down
};

export type Placemark = LatLon & {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly height: number;
  readonly color: string; // Format: "#rrggbb"
  readonly createdAt: string; // ISO
};

export type ImportedLayerKind = 'kml' | 'kmz' | 'geojson';

export type ImportedLayer = {
  readonly id: string;
  readonly name: string;
  readonly kind: ImportedLayerKind;
  readonly visible: boolean;
  readonly sizeBytes: number;
  readonly addedAt: string; // ISO
};

export type MapStyle = 'photorealistic' | 'satellite' | 'hybrid' | 'roadmap';

export type Units = 'metric' | 'imperial';

export type Settings = {
  readonly mapStyle: MapStyle;
  readonly countryLabels: boolean;
  readonly cityLabels: boolean;
  readonly borders: boolean;
  readonly grid: boolean;
  readonly atmosphere: boolean;
  readonly sunLighting: boolean;
  readonly units: Units;
};

export type SearchResult = {
  readonly id: string;
  readonly primary: string;
  readonly secondary: string;
  readonly kind: 'place' | 'coordinates' | 'recent';
  readonly coordinates?: LatLon;
};

export type PlaceTarget = LatLon & {
  readonly name: string;
  readonly address?: string;
  readonly viewport?: { readonly low: LatLon; readonly high: LatLon };
};

export type EarthConfig = {
  readonly googleMapsKey: string;
  readonly features: { readonly photorealistic: boolean; readonly places: boolean };
};
