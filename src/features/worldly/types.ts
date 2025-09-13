import type { ObjectId } from 'mongodb';

export interface Country {
  readonly _id: ObjectId;
  readonly name: string;
  readonly hebrewName: string;
  readonly alpha2: string;
  readonly alpha3: string;
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly capital: string;
  readonly hebrewCapital: string;
  readonly capitalsDistractors?: string[];
  readonly hebrewCapitalsDistractors?: string[];
  readonly continent: string;
  readonly emoji: string;
  readonly flagDistractors?: string[];
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon
  };
}

export interface GameLog {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly gameId: string;
  readonly type: string;
  readonly correct: string;
  readonly selected: string;
  readonly createdAt: Date;
  readonly answeredAt?: Date;
}

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

export interface Subscription {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}
