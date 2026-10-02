// Builds public/data/countries.json from the Worldly bot's country file.
// Run with: npm run data:countries --workspace=@mmps/earth-web
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCE = fileURLToPath(new URL('../../../src/features/worldly/assets/countries.json', import.meta.url));
const TARGET = fileURLToPath(new URL('../public/data/countries.json', import.meta.url));
const EARTH_RADIUS_KM = 6371.0088;

const round = (value) => Math.round(value * 1000) / 1000;
const toRad = (deg) => (deg * Math.PI) / 180;

// Spherical area in km² of a flat, open ring (same formula as turf's ringArea).
function ringArea(ring) {
  let total = 0;
  for (let i = 0; i < ring.length; i += 2) {
    const j = (i + 2) % ring.length;
    total += toRad(ring[j] - ring[i]) * (2 + Math.sin(toRad(ring[i + 1])) + Math.sin(toRad(ring[j + 1])));
  }
  return Math.abs((total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

const polygonArea = ([outer, ...holes]) => ringArea(outer) - holes.reduce((sum, hole) => sum + ringArea(hole), 0);

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [ring[i], ring[i + 1], ring[j], ring[j + 1]];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const pointInPolygon = (lon, lat, [outer, ...holes]) => pointInRing(lon, lat, outer) && !holes.some((hole) => pointInRing(lon, lat, hole));

function coveredShare(polygon, ring) {
  let inside = 0;
  for (let i = 0; i < ring.length; i += 2) if (pointInPolygon(ring[i], ring[i + 1], polygon)) inside++;
  return inside / (ring.length / 2);
}

// The source draws some territories twice (French Guiana is also part of France) and does not
// cut enclaves (San Marino, Vatican…) out of their neighbour. Overlaps break clicking and z-fight,
// so drop duplicates from the larger country and turn enclaves into holes.
function resolveOverlaps(countries) {
  for (const outer of countries) {
    for (const inner of countries) {
      if (inner === outer) continue;
      for (const container of outer.polygons) {
        for (const enclave of inner.polygons) {
          if (enclave.removed || container.removed) continue;
          const share = coveredShare(container, enclave[0]);
          // Vertices on a shared border are ambiguous, so an enclave has nearly all of them inside.
          if (share >= 0.9 && coveredShare(enclave, container[0]) === 0) {
            container.push(enclave[0]);
            console.log(`Enclave: cut ${inner.name} out of ${outer.name}`);
          } else if (share >= 0.25 && coveredShare(enclave, container[0]) >= 0.25 && outer.polygons.length > 1) {
            container.removed = true;
            console.log(`Duplicate territory: dropped ${inner.name} from ${outer.name}`);
          }
        }
      }
    }
  }
  for (const country of countries) country.polygons = country.polygons.filter((polygon) => !polygon.removed);
}

// Flat [lon, lat, lon, lat, ...] without the repeated closing point.
function flattenRing(ring) {
  const [first, last] = [ring[0], ring.at(-1)];
  const open = ring.length > 1 && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
  return open.flatMap(([lon, lat]) => [round(lon), round(lat)]);
}

const source = JSON.parse(readFileSync(SOURCE, 'utf8'));
const parsed = source
  .filter((country) => country.geometry)
  .map((country) => {
    const { type, coordinates } = country.geometry;
    const polygons = type === 'MultiPolygon' ? coordinates : [coordinates];
    return {
      code: country.alpha2,
      name: country.name,
      flag: country.emoji,
      continent: country.continent,
      polygons: polygons.map((polygon) => polygon.map(flattenRing)),
    };
  });

resolveOverlaps(parsed);

const countries = parsed
  .map(({ polygons, ...country }) => ({ ...country, area: Math.round(polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0)), polygons }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(TARGET, JSON.stringify(countries));
console.log(`Wrote ${countries.length} countries to ${TARGET}`);
