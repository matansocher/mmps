import { Cartesian2, type Cartesian3, Cartographic, Math as CesiumMath, type Viewer } from 'cesium';
import type { LatLon } from '../types';

export function pickCartesian(viewer: Viewer, windowPosition: Cartesian2): Cartesian3 | undefined {
  return viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid);
}

export function pickLatLon(viewer: Viewer, windowPosition: Cartesian2): LatLon | null {
  const cartesian = pickCartesian(viewer, windowPosition);
  if (!cartesian) return null;
  const carto = Cartographic.fromCartesian(cartesian);
  return { lat: CesiumMath.toDegrees(carto.latitude), lon: CesiumMath.toDegrees(carto.longitude) };
}

export function pickScreenCenter(viewer: Viewer): Cartesian3 | undefined {
  const canvas = viewer.scene.canvas;
  return pickCartesian(viewer, new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));
}
