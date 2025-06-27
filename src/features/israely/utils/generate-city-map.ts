import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { getCities, simplifyCityName } from '.';
import { City } from '../types';

type GenerateCityOptions = {
  readonly strokeColor: string;
  readonly fillColor?: string;
  readonly lineWidth?: number;
  readonly shouldFill?: boolean;
};

type Area = City;

const WIDTH = 800;
const HEIGHT = 800;
const ZOOM = 0.75;

const COLORS = {
  AREA_BORDER_HIGHLIGHTED: '#FF0000',
  AREA_BORDER: '#000000',
  AREA_LAND: '#D3D3D3',
  OCEAN: '#77afe0',
};

// Function to project lon/lat to canvas coordinates
function project(lon: number, lat: number, zoom = ZOOM, centerLon: number, centerLat: number): [number, number] {
  const finalCenterLon = centerLon;
  const finalCenterLat = centerLat;
  const x = (lon - finalCenterLon) * (WIDTH / zoom) + WIDTH / 2;
  const y = (finalCenterLat - lat) * (HEIGHT / zoom) + HEIGHT / 2; // Invert y-axis
  return [x, y];
}

function drawArea(ctx: CanvasRenderingContext2D, area: Area, coordsArea: Area, { strokeColor, fillColor, shouldFill = false, lineWidth = 1 }: GenerateCityOptions) {
  const { zoom, lon: centerLon, lat: centerLat } = area;

  ctx.beginPath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;

  const coords = coordsArea.geometry.type === 'Polygon' ? [coordsArea.geometry.coordinates] : coordsArea.geometry.coordinates;
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

export function generateCityMap(cityName: string): Canvas {
  const cities = getCities();
  const city = cities.find((c) => simplifyCityName(c.name) === simplifyCityName(cityName));
  if (!city) {
    return undefined;
  }
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background (gray land, ocean)
  ctx.fillStyle = COLORS.OCEAN;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw all cities (land and boundaries)
  cities.forEach((currentCity) => {
    if (!currentCity.geometry) {
      return;
    }
    drawArea(ctx, city, currentCity, { shouldFill: true, fillColor: COLORS.AREA_LAND, strokeColor: COLORS.AREA_BORDER });
  });

  // Draw the selected city
  drawArea(ctx, city, city, { lineWidth: 3, strokeColor: COLORS.AREA_BORDER_HIGHLIGHTED });

  return canvas;
}
