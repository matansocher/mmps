import type { ObjectId } from 'mongodb';

export interface State {
  readonly _id: ObjectId;
  readonly name: string;
  readonly hebrewName: string;
  readonly alpha2: string;
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly capital: string;
  readonly hebrewCapital: string;
  readonly geometry: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
}
