import type { FlightState } from '@services/opensky';
import type { Country } from '@shared/worldly';
import { computeBoundingBox, isFlightInCountry } from './get-flights-above-country';

function createFlight(longitude: number, latitude: number): FlightState {
  return { icao24: 'abc123', callsign: 'TEST', originCountry: 'Test', longitude, latitude, altitude: 10000, onGround: false, velocity: 250 };
}

// Simple square: corners at [0,0], [10,0], [10,10], [0,10] (lon, lat)
const squarePolygonGeometry: NonNullable<Country['geometry']> = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

// Two separate squares as MultiPolygon
const multiPolygonGeometry: NonNullable<Country['geometry']> = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [0, 0],
        [5, 0],
        [5, 5],
        [0, 5],
        [0, 0],
      ],
    ],
    [
      [
        [20, 20],
        [25, 20],
        [25, 25],
        [20, 25],
        [20, 20],
      ],
    ],
  ],
};

// L-shaped polygon
const lShapedGeometry: NonNullable<Country['geometry']> = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

describe('isFlightInCountry()', () => {
  describe('Polygon geometry', () => {
    it('should return true for a flight inside the polygon', () => {
      const flight = createFlight(5, 5);
      expect(isFlightInCountry(flight, squarePolygonGeometry)).toEqual(true);
    });

    it('should return false for a flight outside the polygon', () => {
      const flight = createFlight(15, 5);
      expect(isFlightInCountry(flight, squarePolygonGeometry)).toEqual(false);
    });

    it('should return false for a flight completely outside', () => {
      const flight = createFlight(-5, -5);
      expect(isFlightInCountry(flight, squarePolygonGeometry)).toEqual(false);
    });

    it('should return true for a flight near the center', () => {
      const flight = createFlight(3, 7);
      expect(isFlightInCountry(flight, squarePolygonGeometry)).toEqual(true);
    });

    it('should handle L-shaped polygon - point in wide part', () => {
      const flight = createFlight(7, 2);
      expect(isFlightInCountry(flight, lShapedGeometry)).toEqual(true);
    });

    it('should handle L-shaped polygon - point in tall part', () => {
      const flight = createFlight(2, 8);
      expect(isFlightInCountry(flight, lShapedGeometry)).toEqual(true);
    });

    it('should handle L-shaped polygon - point in cutout area', () => {
      const flight = createFlight(7, 7);
      expect(isFlightInCountry(flight, lShapedGeometry)).toEqual(false);
    });
  });

  describe('MultiPolygon geometry', () => {
    it('should return true for a flight in the first polygon', () => {
      const flight = createFlight(3, 3);
      expect(isFlightInCountry(flight, multiPolygonGeometry)).toEqual(true);
    });

    it('should return true for a flight in the second polygon', () => {
      const flight = createFlight(22, 22);
      expect(isFlightInCountry(flight, multiPolygonGeometry)).toEqual(true);
    });

    it('should return false for a flight between the two polygons', () => {
      const flight = createFlight(12, 12);
      expect(isFlightInCountry(flight, multiPolygonGeometry)).toEqual(false);
    });

    it('should return false for a flight outside all polygons', () => {
      const flight = createFlight(50, 50);
      expect(isFlightInCountry(flight, multiPolygonGeometry)).toEqual(false);
    });
  });
});

describe('computeBoundingBox()', () => {
  describe('Polygon geometry', () => {
    it('should compute correct bounding box for a square polygon', () => {
      const result = computeBoundingBox(squarePolygonGeometry);
      expect(result).toEqual({ lamin: 0, lomin: 0, lamax: 10, lomax: 10 });
    });

    it('should compute correct bounding box for an L-shaped polygon', () => {
      const result = computeBoundingBox(lShapedGeometry);
      expect(result).toEqual({ lamin: 0, lomin: 0, lamax: 10, lomax: 10 });
    });

    it('should handle negative coordinates', () => {
      const geometry: NonNullable<Country['geometry']> = {
        type: 'Polygon',
        coordinates: [
          [
            [-10, -20],
            [10, -20],
            [10, 20],
            [-10, 20],
            [-10, -20],
          ],
        ],
      };
      const result = computeBoundingBox(geometry);
      // coordinates are [lon, lat], so lon range: -10 to 10, lat range: -20 to 20
      expect(result).toEqual({ lamin: -20, lomin: -10, lamax: 20, lomax: 10 });
    });
  });

  describe('MultiPolygon geometry', () => {
    it('should compute bounding box spanning all polygons', () => {
      const result = computeBoundingBox(multiPolygonGeometry);
      // First polygon: lon 0-5, lat 0-5. Second: lon 20-25, lat 20-25.
      expect(result).toEqual({ lamin: 0, lomin: 0, lamax: 25, lomax: 25 });
    });

    it('should handle MultiPolygon with overlapping ranges', () => {
      const geometry: NonNullable<Country['geometry']> = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
          [
            [
              [5, 5],
              [15, 5],
              [15, 15],
              [5, 15],
              [5, 5],
            ],
          ],
        ],
      };
      const result = computeBoundingBox(geometry);
      expect(result).toEqual({ lamin: 0, lomin: 0, lamax: 15, lomax: 15 });
    });
  });
});
