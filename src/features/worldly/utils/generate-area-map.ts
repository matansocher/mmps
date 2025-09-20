import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { Country, State } from '@shared/worldly';
import { simplifyAreaName } from '.';

type GenerateAreaOptions = {
  readonly strokeColor: string;
  readonly fillColor?: string;
  readonly lineWidth?: number;
  readonly shouldFill?: boolean;
};

export type Area = Country | State;

const WIDTH = 800;
const HEIGHT = 800;
const ZOOM = 60;

const US_CENTER_LON = -96.726486;
const US_CENTER_LAT = 38.5266;

const COLORS = {
  AREA_BORDER_HIGHLIGHTED: '#FF0000',
  AREA_BORDER: '#000000',
  AREA_LAND: '#D3D3D3',
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

function drawArea(ctx: CanvasRenderingContext2D, area: Area, coordsArea: Area, isState: boolean, { strokeColor, fillColor, shouldFill = false, lineWidth = 1 }: GenerateAreaOptions) {
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

export function generateAreaMap(allAreas: Area[], areaName: string, isState = false): Canvas {
  const area = allAreas.find((c) => simplifyAreaName(c.name) === simplifyAreaName(areaName));
  if (!area) {
    return undefined;
  }
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background (gray land, ocean)
  ctx.fillStyle = COLORS.OCEAN;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw all countries (land and boundaries)
  allAreas.forEach((currentArea) => {
    if (!currentArea.geometry) {
      return;
    }
    drawArea(ctx, area, currentArea, isState, { shouldFill: true, fillColor: COLORS.AREA_LAND, strokeColor: COLORS.AREA_BORDER });
  });

  // Draw the selected area
  drawArea(ctx, area, area, isState, { lineWidth: 3, strokeColor: COLORS.AREA_BORDER_HIGHLIGHTED });

  return canvas;
}
