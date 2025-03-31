import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { getCountries, simplifyCountryName } from '.';

const WIDTH = 600;
const HEIGHT = 600;
const ZOOM = 60;

// Function to project lon/lat to canvas coordinates
function project(lon: number, lat: number, zoom = ZOOM, centerLon: number, centerLat: number): [number, number] {
  const x = (lon - centerLon) * (WIDTH / zoom) + WIDTH / 2;
  const y = (centerLat - lat) * (HEIGHT / zoom) + HEIGHT / 2; // Invert y-axis
  return [x, y];
}

export function generateCountryMap(countryName: string): Canvas {
  const countries = getCountries();
  const country = countries.find((c) => simplifyCountryName(c.name) === simplifyCountryName(countryName));
  if (!country) {
    return undefined;
  }
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // Background (gray land, ocean)
  ctx.fillStyle = '#77afe0'; // Ocean
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw all countries (land and boundaries)
  countries.forEach((currentCountry) => {
    const coords = currentCountry.geometry?.type === 'Polygon' ? [currentCountry.geometry?.coordinates] : currentCountry.geometry?.coordinates;
    if (!coords) {
      return;
    }

    ctx.beginPath();
    ctx.fillStyle = '#D3D3D3'; // countries land
    ctx.strokeStyle = '#000000'; // countries borders
    ctx.lineWidth = 1;

    coords.forEach((polygon) => {
      polygon.forEach((ring: number[][], ringIdx: number) => {
        ring.forEach(([lon, lat], i) => {
          const [x, y] = project(lon, lat, country.zoom, country.lon, country.lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        if (ringIdx === 0) ctx.closePath();
      });
    });
    ctx.fill();
    ctx.stroke();
  });

  // Highlight the selected country
  const coords = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;

  ctx.beginPath();
  ctx.strokeStyle = '#FF0000'; // Red outline for selected country
  ctx.lineWidth = 2;

  coords.forEach((polygon) => {
    polygon.forEach((ring: number[][], ringIdx: number) => {
      ring.forEach(([lon, lat], i) => {
        const [x, y] = project(lon, lat, country.zoom, country.lon, country.lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (ringIdx === 0) ctx.closePath();
    });
  });
  ctx.stroke();

  return canvas;
}
