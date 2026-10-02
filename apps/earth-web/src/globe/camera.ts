import { BoundingSphere, Cartesian3, Cartographic, Math as CesiumMath, EasingFunction, HeadingPitchRange, Matrix4, Rectangle, type Viewer } from 'cesium';
import type { CameraView, LatLon, PlaceTarget } from '../types';
import { pickScreenCenter } from './pick';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const duration = (seconds: number) => (prefersReducedMotion() ? 0 : seconds);

export const HOME_VIEW: CameraView = { lat: 25, lon: 30, altitude: 19_000_000, heading: 0, pitch: -90 };

export function getCameraView(viewer: Viewer): CameraView {
  const { camera } = viewer;
  const carto = camera.positionCartographic;
  return {
    lat: CesiumMath.toDegrees(carto.latitude),
    lon: CesiumMath.toDegrees(carto.longitude),
    altitude: carto.height,
    heading: CesiumMath.toDegrees(camera.heading),
    pitch: CesiumMath.toDegrees(camera.pitch),
  };
}

export function flyToView(viewer: Viewer, view: CameraView, seconds = 2.5): Promise<boolean> {
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

export type OrbitTarget = LatLon & {
  readonly height: number;
  readonly range: number;
  readonly heading: number; // degrees
  readonly pitch: number; // degrees
};

export function flyToTarget(viewer: Viewer, target: OrbitTarget, seconds?: number): Promise<boolean> {
  const center = Cartesian3.fromDegrees(target.lon, target.lat, target.height);
  return new Promise((resolve) => {
    viewer.camera.flyToBoundingSphere(new BoundingSphere(center, 0), {
      offset: new HeadingPitchRange(CesiumMath.toRadians(target.heading), CesiumMath.toRadians(target.pitch), target.range),
      duration: seconds === undefined ? undefined : duration(seconds),
      complete: () => resolve(true),
      cancel: () => resolve(false),
    });
  });
}

export function flyToPlace(viewer: Viewer, place: PlaceTarget): Promise<boolean> {
  let range = 1500;
  if (place.viewport) {
    const rect = Rectangle.fromDegrees(place.viewport.low.lon, place.viewport.low.lat, place.viewport.high.lon, place.viewport.high.lat);
    const sw = Cartesian3.fromRadians(rect.west, rect.south);
    const ne = Cartesian3.fromRadians(rect.east, rect.north);
    range = Math.max(600, Cartesian3.distance(sw, ne) * 1.1);
  }
  const pitch = range > 150_000 ? -90 : range > 20_000 ? -60 : -40;
  return flyToTarget(viewer, { lat: place.lat, lon: place.lon, height: 0, range, heading: 0, pitch });
}

export const MAX_ALTITUDE = 60_000_000;

const FULL_TILT_BELOW = 400_000;
const NO_TILT_ABOVE = 6_000_000;
const USER_INPUT_WINDOW_MS = 1200;

// Like Google Earth: the higher you go, the less the view may tilt, so zooming out always ends straight down on a centered globe.
export function maxPitchForHeight(height: number): number {
  const t = Math.min(Math.max((height - FULL_TILT_BELOW) / (NO_TILT_ABOVE - FULL_TILT_BELOW), 0), 1);
  return CesiumMath.toRadians(-90 * t);
}

export function limitTilt(viewer: Viewer): void {
  const { camera, scene } = viewer;
  const maxPitch = maxPitchForHeight(camera.positionCartographic.height);
  if (camera.pitch <= maxPitch + 1e-4) return;
  const center = pickScreenCenter(viewer);
  if (center) {
    const range = Math.min(Cartesian3.distance(camera.positionWC, center), MAX_ALTITUDE);
    camera.lookAt(center, new HeadingPitchRange(camera.heading, maxPitch, range));
    camera.lookAtTransform(Matrix4.IDENTITY);
  } else {
    camera.setView({ orientation: { heading: camera.heading, pitch: maxPitch, roll: 0 } });
  }
  scene.requestRender();
}

// Only clamps right after user input (incl. inertia) so programmatic flights and tours aren't fought.
export function installTiltLimiter(viewer: Viewer): () => void {
  const canvas = viewer.scene.canvas;
  let lastInput = 0;
  const mark = () => (lastInput = performance.now());
  const markDrag = (event: PointerEvent) => event.buttons !== 0 && mark();
  const options = { passive: true, capture: true };
  canvas.addEventListener('wheel', mark, options);
  canvas.addEventListener('pointerdown', mark, options);
  canvas.addEventListener('pointermove', markDrag, options);
  canvas.addEventListener('touchmove', mark, options);
  const removePreUpdate = viewer.scene.preUpdate.addEventListener(() => {
    if (performance.now() - lastInput < USER_INPUT_WINDOW_MS) limitTilt(viewer);
  });
  return () => {
    removePreUpdate();
    canvas.removeEventListener('wheel', mark, options);
    canvas.removeEventListener('pointerdown', mark, options);
    canvas.removeEventListener('pointermove', markDrag, options);
    canvas.removeEventListener('touchmove', mark, options);
  };
}

function orbitAroundCenter(viewer: Viewer, heading: number, pitch: number | null, rangeFactor: number, seconds: number): boolean {
  const center = pickScreenCenter(viewer);
  if (!center) return false;
  const { camera } = viewer;
  const range = Math.min(Math.max(Cartesian3.distance(camera.positionWC, center) * rangeFactor, 20), 50_000_000);
  const targetPitch = Math.min(pitch ?? camera.pitch, maxPitchForHeight(range));
  camera.flyToBoundingSphere(new BoundingSphere(center, 0), {
    offset: new HeadingPitchRange(heading, targetPitch, range),
    duration: duration(seconds),
  });
  return true;
}

export function resetNorth(viewer: Viewer): void {
  if (!orbitAroundCenter(viewer, 0, null, 1, 0.8)) {
    const { camera } = viewer;
    camera.setView({ orientation: { heading: 0, pitch: camera.pitch, roll: 0 } });
  }
}

export function isTopDown(viewer: Viewer): boolean {
  return CesiumMath.toDegrees(viewer.camera.pitch) < -80;
}

export function toggleTilt(viewer: Viewer): void {
  const target = isTopDown(viewer) ? CesiumMath.toRadians(-40) : CesiumMath.toRadians(-90);
  orbitAroundCenter(viewer, viewer.camera.heading, target, 1, 0.9);
}

export function zoomBy(viewer: Viewer, factor: number): void {
  if (!orbitAroundCenter(viewer, viewer.camera.heading, null, factor, 0.35)) {
    const height = viewer.camera.positionCartographic.height;
    if (factor < 1) viewer.camera.zoomIn(height * (1 - factor));
    else viewer.camera.zoomOut(height * (factor - 1));
    viewer.scene.requestRender();
  }
}

// Rotates the globe under the camera (keyboard arrows); scales with altitude.
export function nudge(viewer: Viewer, direction: 'left' | 'right' | 'up' | 'down'): void {
  const { camera } = viewer;
  const height = Math.max(camera.positionCartographic.height, 50);
  const angle = Math.min(0.15, Math.max(1e-7, (height / 6_371_000) * 0.12));
  if (direction === 'left') camera.rotateRight(angle);
  if (direction === 'right') camera.rotateLeft(angle);
  if (direction === 'up') camera.rotateDown(angle);
  if (direction === 'down') camera.rotateUp(angle);
  viewer.scene.requestRender();
}

// Slowly circles the camera around a point (Voyager "orbit"). Returns a stop function.
export function startOrbit(viewer: Viewer, target: OrbitTarget, degreesPerSecond = 6): () => void {
  const center = Cartesian3.fromDegrees(target.lon, target.lat, target.height);
  const { camera } = viewer;
  const startHeading = camera.heading;
  const pitch = camera.pitch;
  const range = Cartesian3.distance(camera.positionWC, center);
  let frame = 0;
  let last = performance.now();
  let heading = startHeading;
  const step = (now: number) => {
    heading += CesiumMath.toRadians(degreesPerSecond) * ((now - last) / 1000);
    last = now;
    camera.lookAt(center, new HeadingPitchRange(heading, pitch, range));
    viewer.scene.requestRender();
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  const controller = viewer.scene.screenSpaceCameraController;
  const stop = () => {
    cancelAnimationFrame(frame);
    camera.lookAtTransform(Matrix4.IDENTITY);
    controller.enableInputs = true;
    viewer.scene.canvas.removeEventListener('pointerdown', stop);
    viewer.scene.canvas.removeEventListener('wheel', stop);
  };
  viewer.scene.canvas.addEventListener('pointerdown', stop, { once: true });
  viewer.scene.canvas.addEventListener('wheel', stop, { once: true });
  return stop;
}

export function cartographicToLatLon(carto: Cartographic): LatLon {
  return { lat: CesiumMath.toDegrees(carto.latitude), lon: CesiumMath.toDegrees(carto.longitude) };
}
