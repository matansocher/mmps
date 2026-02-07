import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import { getFlightsInBoundingBox } from '@services/opensky';
import type { BoundingBox, FlightState } from '@services/opensky';
import type { Country } from '@shared/worldly';
import { getAllCountries } from '@shared/worldly/mongo/country';

export type FlightsAboveCountryResult = {
  readonly country: Country;
  readonly flightCount: number;
  readonly flights: FlightState[];
};

function computeBoundingBox(geometry: NonNullable<Country['geometry']>): BoundingBox {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  const processCoordinates = (coords: number[][]) => {
    for (const coord of coords) {
      const [lon, lat] = coord; // GeoJSON is [lon, lat]
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };

  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    for (const ring of coords) {
      processCoordinates(ring);
    }
  } else if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    for (const poly of coords) {
      for (const ring of poly) {
        processCoordinates(ring);
      }
    }
  }

  return { lamin: minLat, lomin: minLon, lamax: maxLat, lomax: maxLon };
}

function isFlightInCountry(flight: FlightState, geometry: NonNullable<Country['geometry']>): boolean {
  const pt = point([flight.longitude, flight.latitude]);

  if (geometry.type === 'Polygon') {
    return booleanPointInPolygon(pt, polygon(geometry.coordinates as number[][][]));
  }

  // MultiPolygon: check each polygon individually
  const coords = geometry.coordinates as number[][][][];
  return coords.some((polyCoords) => booleanPointInPolygon(pt, polygon(polyCoords)));
}

export async function getFlightsAboveCountry(countryName: string): Promise<FlightsAboveCountryResult> {
  const allCountries = await getAllCountries();
  const country = allCountries.find((c) => c.name.toLowerCase() === countryName.toLowerCase());

  if (!country) {
    throw new Error(`Country "${countryName}" not found`);
  }

  if (!country.geometry) {
    throw new Error(`Country "${country.name}" has no geometry data available`);
  }

  const bounds = computeBoundingBox(country.geometry);
  const allFlights = await getFlightsInBoundingBox(bounds);
  const flights = allFlights.filter((f) => isFlightInCountry(f, country.geometry));

  return { country, flightCount: flights.length, flights };
}
