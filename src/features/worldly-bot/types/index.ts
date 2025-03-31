export type Country = {
  readonly name: string;
  readonly alpha2: string;
  readonly alpha3: string;
  readonly ISO3: number;
  readonly lat: number;
  readonly lon: number;
  readonly zoom: number;
  readonly capital: string;
  readonly continent?: string;
  readonly emoji: string;
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
};
