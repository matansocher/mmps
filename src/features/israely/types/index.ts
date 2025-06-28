export type City = {
  readonly name: string;
  readonly hebrewName: string;
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
};

export type Country = {
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
};
