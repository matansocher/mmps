export type MapOptions = {
  readonly lat: number;
  readonly lon: number;
  readonly zoom?: number;
  readonly tileRange?: number;
  readonly tileSize?: number;
  readonly addMarker?: boolean;
};

export type TileCoordinate = {
  readonly x: number;
  readonly y: number;
};
