export type Country = {
  readonly name: string;
  readonly hebrewName?: string;
  readonly alpha2: string;
  readonly alpha3: string;
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly capital?: string;
  readonly hebrewCapital?: string;
  readonly continent?: string;
  readonly hebrewContinent?: string;
  readonly emoji: string;
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
};

export type State = {
  readonly name: string;
  readonly hebrewName?: string;
  readonly alpha2: string;
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly capital?: string;
  readonly hebrewCapital?: string;
  readonly geometry: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
};
