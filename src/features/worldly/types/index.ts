// export type Area = Country | State | Continent;

export type Area = {
  readonly name: string;
  readonly hebrewName: string;
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly geometry: {
    readonly type: string;
    readonly coordinates: number[][][] | number[][][][];
  };
};

export type Country = Area & {
  readonly alpha2: string;
  readonly alpha3: string;
  readonly capital: string;
  readonly hebrewCapital: string;
  readonly continent: string;
  readonly emoji: string;
};

export type State = Area & {
  readonly alpha2: string;
  readonly capital: string;
  readonly hebrewCapital: string;
};

export type Continent = Area;
