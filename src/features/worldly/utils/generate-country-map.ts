import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { getCountries, getStates, simplifyCountryName } from '.';
import { Country, State } from '../types';

type GenerateCountryOptions = {
  readonly strokeColor: string;
  readonly fillColor?: string;
  readonly lineWidth?: number;
  readonly shouldFill?: boolean;
};

type Area = Country | State;

const WIDTH = 800;
const HEIGHT = 800;
const ZOOM = 60;

const US_CENTER_LON = -96.726486;
const US_CENTER_LAT = 38.5266;

const COLORS = {
  COUNTRY_BORDER_HIGHLIGHTED: '#FF0000',
  COUNTRY_BORDER: '#000000',
  COUNTRY_LAND: '#D3D3D3',
  OCEAN: '#77afe0',
};

// Function to project lon/lat to canvas coordinates
function project(lon: number, lat: number, zoom = ZOOM, centerLon: number, centerLat: number, isState: boolean): [number, number] {
  const finalCenterLon = isState ? US_CENTER_LON : centerLon;
  const finalCenterLat = isState ? US_CENTER_LAT : centerLat;
  const x = (lon - finalCenterLon) * (WIDTH / zoom) + WIDTH / 2;
  const y = (finalCenterLat - lat) * (HEIGHT / zoom) + HEIGHT / 2; // Invert y-axis
  return [x, y];
}

function drawCountry(ctx: CanvasRenderingContext2D, country: Area, coordsCountry: Area, isState: boolean, { strokeColor, fillColor, shouldFill = false, lineWidth = 1 }: GenerateCountryOptions) {
  const { zoom, lon: centerLon, lat: centerLat } = country;

  ctx.beginPath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;

  const coords = coordsCountry.geometry.type === 'Polygon' ? [coordsCountry.geometry.coordinates] : coordsCountry.geometry.coordinates;
  coords.forEach((polygon) => {
    polygon.forEach((ring: number[][], ringIdx: number) => {
      ring.forEach(([lon, lat], i) => {
        const [x, y] = project(lon, lat, zoom, centerLon, centerLat, isState);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (ringIdx === 0) ctx.closePath();
    });
  });

  shouldFill && ctx.fill();
  ctx.stroke();
}

export function generateCountryMap(countryName: string, isState = false): Canvas {
  const countries = isState ? getStates() : getCountries();
  const country = countries.find((c) => simplifyCountryName(c.name) === simplifyCountryName(countryName));
  if (!country) {
    return undefined;
  }
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background (gray land, ocean)
  ctx.fillStyle = COLORS.OCEAN;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw all countries (land and boundaries)
  countries.forEach((currentCountry) => {
    if (!currentCountry.geometry) {
      return;
    }
    drawCountry(ctx, country, currentCountry, isState, { shouldFill: true, fillColor: COLORS.COUNTRY_LAND, strokeColor: COLORS.COUNTRY_BORDER });
  });

  // Draw the selected country
  drawCountry(ctx, country, country, isState, { lineWidth: 3, strokeColor: COLORS.COUNTRY_BORDER_HIGHLIGHTED });

  return canvas;
}
