import { Cartesian2, Cartesian3, Cartographic, Math as CesiumMath, type Viewer } from 'cesium';
import type { LatLon } from '../types';

export type PickedPoint = LatLon & {
  readonly height: number;
  readonly cartesian: Cartesian3;
};

export function pickCartesian(viewer: Viewer, windowPosition: Cartesian2): Cartesian3 | undefined {
  const { scene, camera } = viewer;
  if (scene.pickPositionSupported) {
    const picked = scene.pickPosition(windowPosition);
    if (picked && Cartesian3.magnitude(picked) > 6_000_000) return picked;
  }
  if (scene.globe.show) {
    const ray = camera.getPickRay(windowPosition);
    const onGlobe = ray ? scene.globe.pick(ray, scene) : undefined;
    if (onGlobe) return onGlobe;
  }
  return camera.pickEllipsoid(windowPosition, scene.globe.ellipsoid);
}

export function toPickedPoint(cartesian: Cartesian3): PickedPoint {
  const carto = Cartographic.fromCartesian(cartesian);
  return {
    lat: CesiumMath.toDegrees(carto.latitude),
    lon: CesiumMath.toDegrees(carto.longitude),
    height: carto.height,
    cartesian,
  };
}

export function pickPoint(viewer: Viewer, windowPosition: Cartesian2): PickedPoint | undefined {
  const cartesian = pickCartesian(viewer, windowPosition);
  return cartesian ? toPickedPoint(cartesian) : undefined;
}

export function pickScreenCenter(viewer: Viewer): Cartesian3 | undefined {
  const canvas = viewer.scene.canvas;
  return pickCartesian(viewer, new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));
}

// Meters per CSS pixel near the bottom-center of the screen (for the scale bar).
export function metersPerPixel(viewer: Viewer): number | null {
  const canvas = viewer.scene.canvas;
  const y = canvas.clientHeight - 60;
  const x = canvas.clientWidth / 2;
  const left = viewer.camera.pickEllipsoid(new Cartesian2(x - 50, y));
  const right = viewer.camera.pickEllipsoid(new Cartesian2(x + 50, y));
  if (!left || !right) return null;
  return Cartesian3.distance(left, right) / 100;
}
