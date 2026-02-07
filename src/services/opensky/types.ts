export type BoundingBox = {
  readonly lamin: number; // min latitude (south)
  readonly lomin: number; // min longitude (west)
  readonly lamax: number; // max latitude (north)
  readonly lomax: number; // max longitude (east)
};

export type FlightState = {
  readonly icao24: string;
  readonly callsign: string;
  readonly originCountry: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly altitude: number | null;
  readonly onGround: boolean;
  readonly velocity: number | null;
};
