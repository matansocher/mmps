export type AdsbAircraft = {
  readonly hex: string;
  readonly flight?: string; // callsign, space-padded
  readonly r?: string; // registration
  readonly t?: string; // ICAO aircraft type
  readonly lat?: number;
  readonly lon?: number;
  readonly alt_baro?: number | 'ground';
};

export type AdsbLolResponse = {
  readonly ac?: AdsbAircraft[];
};

export type AdsbFiResponse = {
  readonly aircraft?: AdsbAircraft[];
};

export type RadiusQuery = {
  readonly lat: number;
  readonly lon: number;
  readonly radiusNm: number;
};
