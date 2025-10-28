export type EarthquakeProperties = {
  readonly mag: number;
  readonly place: string;
  readonly time: number;
  readonly updated: number;
  readonly tz: number | null;
  readonly url: string;
  readonly detail: string;
  readonly felt: number | null;
  readonly cdi: number | null;
  readonly mmi: number | null;
  readonly alert: 'green' | 'yellow' | 'orange' | 'red' | null;
  readonly status: string;
  readonly tsunami: number;
  readonly sig: number;
  readonly net: string;
  readonly code: string;
  readonly ids: string;
  readonly sources: string;
  readonly types: string;
  readonly nst: number | null;
  readonly dmin: number | null;
  readonly rms: number;
  readonly gap: number | null;
  readonly magType: string;
  readonly type: string;
  readonly title: string;
};

export type EarthquakeGeometry = {
  readonly type: 'Point';
  readonly coordinates: [number, number, number]; // [longitude, latitude, depth]
};

export type Earthquake = {
  readonly type: 'Feature';
  readonly properties: EarthquakeProperties;
  readonly geometry: EarthquakeGeometry;
  readonly id: string;
};

export type USGSResponse = {
  readonly type: 'FeatureCollection';
  readonly metadata: {
    readonly generated: number;
    readonly url: string;
    readonly title: string;
    readonly status: number;
    readonly api: string;
    readonly count: number;
  };
  readonly features: Earthquake[];
  readonly bbox?: number[];
};
