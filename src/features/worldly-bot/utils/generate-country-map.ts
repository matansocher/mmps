import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { Country } from '@features/worldly-bot/types';
import { getCountries, simplifyCountryName } from '.';

type GenerateCountryOptions = {
  readonly strokeColor: string;
  readonly fillColor?: string;
  readonly lineWidth?: number;
  readonly shouldFill?: boolean;
};

const WIDTH = 800;
const HEIGHT = 800;
const ZOOM = 60;

const COLORS = {
  COUNTRY_BORDER_HIGHLIGHTED: '#FF0000',
  COUNTRY_BORDER: '#000000',
  COUNTRY_LAND: '#D3D3D3',
  OCEAN: '#77afe0',
};

// Function to project lon/lat to canvas coordinates
function project(lon: number, lat: number, zoom = ZOOM, centerLon: number, centerLat: number): [number, number] {
  const x = (lon - centerLon) * (WIDTH / zoom) + WIDTH / 2;
  const y = (centerLat - lat) * (HEIGHT / zoom) + HEIGHT / 2; // Invert y-axis
  return [x, y];
}

function drawCountry(ctx: CanvasRenderingContext2D, country: Country, coordsCountry: Country, { strokeColor, fillColor, shouldFill = false, lineWidth = 1 }: GenerateCountryOptions) {
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
        const [x, y] = project(lon, lat, zoom, centerLon, centerLat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (ringIdx === 0) ctx.closePath();
    });
  });

  shouldFill && ctx.fill();
  ctx.stroke();
}

export function generateCountryMap(countryName: string): Canvas {
  const countries = getCountries();
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
    drawCountry(ctx, country, currentCountry, { shouldFill: true, fillColor: COLORS.COUNTRY_LAND, strokeColor: COLORS.COUNTRY_BORDER });
  });

  // Draw the selected country
  drawCountry(ctx, country, country, { lineWidth: 2, strokeColor: COLORS.COUNTRY_BORDER_HIGHLIGHTED });

  return canvas;
}
