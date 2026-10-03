import { BoundingSphere, Cartesian3, Math as CesiumMath, EasingFunction, HeadingPitchRange, type Viewer } from 'cesium';
import type { CameraView } from '../types';
import { pickScreenCenter } from './pick';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const duration = (seconds: number) => (prefersReducedMotion() ? 0 : seconds);

export const MIN_ALTITUDE = 80_000;
export const MAX_ALTITUDE = 40_000_000;
export const HOME_VIEW: CameraView = { lat: 25, lon: 15, altitude: 19_000_000, heading: 0, pitch: -90 };

const TOP_DOWN = CesiumMath.toRadians(-90);

export function flyToView(viewer: Viewer, view: CameraView, seconds = 2): Promise<boolean> {
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(view.lon, view.lat, view.altitude),
      orientation: { heading: CesiumMath.toRadians(view.heading), pitch: CesiumMath.toRadians(view.pitch), roll: 0 },
      duration: duration(seconds),
      easingFunction: EasingFunction.QUADRATIC_IN_OUT,
      complete: () => resolve(true),
      cancel: () => resolve(false),
    });
  });
}

export function setView(viewer: Viewer, view: CameraView): void {
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(view.lon, view.lat, view.altitude),
    orientation: { heading: CesiumMath.toRadians(view.heading), pitch: CesiumMath.toRadians(view.pitch), roll: 0 },
  });
  viewer.scene.requestRender();
}

// Frames an area of `spanKm` across, keeping the current heading.
export function flyToArea(viewer: Viewer, lat: number, lon: number, spanKm: number): Promise<boolean> {
  const altitude = Math.min(Math.max(spanKm * 1000 * 3, 2_500_000), 14_000_000);
  return flyToView(viewer, { lat, lon, altitude, heading: CesiumMath.toDegrees(viewer.camera.heading), pitch: -90 }, 1.6);
}

function orbitAroundCenter(viewer: Viewer, heading: number, rangeFactor: number, seconds: number): boolean {
  const center = pickScreenCenter(viewer);
  if (!center) return false;
  const range = Math.min(Math.max(Cartesian3.distance(viewer.camera.positionWC, center) * rangeFactor, MIN_ALTITUDE), MAX_ALTITUDE);
  viewer.camera.flyToBoundingSphere(new BoundingSphere(center, 0), { offset: new HeadingPitchRange(heading, TOP_DOWN, range), duration: duration(seconds) });
  return true;
}

export function resetNorth(viewer: Viewer): void {
  if (!orbitAroundCenter(viewer, 0, 1, 0.8)) setView(viewer, HOME_VIEW);
}

export function zoomBy(viewer: Viewer, factor: number): void {
  orbitAroundCenter(viewer, viewer.camera.heading, factor, 0.35);
}

// Rotates the globe under the camera (keyboard arrows); scales with altitude.
export function nudge(viewer: Viewer, direction: 'left' | 'right' | 'up' | 'down'): void {
  const { camera } = viewer;
  const angle = Math.min(0.15, Math.max(1e-4, (camera.positionCartographic.height / 6_371_000) * 0.12));
  if (direction === 'left') camera.rotateRight(angle);
  if (direction === 'right') camera.rotateLeft(angle);
  if (direction === 'up') camera.rotateDown(angle);
  if (direction === 'down') camera.rotateUp(angle);
  viewer.scene.requestRender();
}
