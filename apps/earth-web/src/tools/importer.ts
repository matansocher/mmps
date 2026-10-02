import { Color, type DataSource, GeoJsonDataSource, KmlDataSource, type Viewer } from 'cesium';
import type { ImportedLayer, ImportedLayerKind } from '../types';

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export function detectKind(fileName: string): ImportedLayerKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.kmz')) return 'kmz';
  if (lower.endsWith('.kml')) return 'kml';
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) return 'geojson';
  return null;
}

// Rich KML/GeoJSON descriptions are untrusted HTML: keep plain text only.
function sanitizeDescriptions(source: DataSource): void {
  for (const entity of source.entities.values) {
    if (!entity.description) continue;
    const value = entity.description as unknown;
    const raw = typeof value === 'string' ? value : (value as { getValue?: (t: unknown) => unknown }).getValue?.(source.clock?.currentTime);
    if (typeof raw !== 'string') continue;
    const text = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
    entity.description = text.trim();
  }
}

export async function loadLayerDataSource(viewer: Viewer, layer: ImportedLayer, blob: Blob): Promise<DataSource> {
  let source: DataSource;
  if (layer.kind === 'geojson') {
    const json: unknown = JSON.parse(await blob.text());
    source = await GeoJsonDataSource.load(json as object, {
      clampToGround: true,
      stroke: Color.fromCssColorString('#8ab4f8'),
      fill: Color.fromCssColorString('#8ab4f8').withAlpha(0.25),
      strokeWidth: 3,
      markerColor: Color.fromCssColorString('#ea4335'),
    });
  } else {
    source = await KmlDataSource.load(blob, { camera: viewer.scene.camera, canvas: viewer.scene.canvas, clampToGround: true, screenOverlayContainer: undefined });
  }
  source.name = layer.name;
  sanitizeDescriptions(source);
  source.show = layer.visible;
  await viewer.dataSources.add(source);
  viewer.scene.requestRender();
  return source;
}
