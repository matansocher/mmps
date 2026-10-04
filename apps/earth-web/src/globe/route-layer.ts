import { Cartesian3, Cartographic, Color, EllipsoidGeodesic, Material, PolylineCollection, type Viewer } from 'cesium';
import type { LatLon } from '../types';
import { PALETTE } from './colors';

const SEGMENTS = 64;
const DRAW_MS = 900;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// A great-circle arc that lifts off the surface like a flight path.
function arc(from: LatLon, to: LatLon): Cartesian3[] {
  const geodesic = new EllipsoidGeodesic(Cartographic.fromDegrees(from.lon, from.lat), Cartographic.fromDegrees(to.lon, to.lat));
  const lift = Math.min(geodesic.surfaceDistance * 0.12, 1_200_000) + 20_000;
  return Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const t = i / SEGMENTS;
    const point = geodesic.interpolateUsingFraction(t);
    return Cartesian3.fromRadians(point.longitude, point.latitude, Math.sin(Math.PI * t) * lift);
  });
}

// The round's itinerary: dashed flight arcs between the countries the player has found.
export class RouteLayer {
  private readonly lines: PolylineCollection;
  private readonly viewer: Viewer;
  private readonly frames = new Set<number>();

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.lines = viewer.scene.primitives.add(new PolylineCollection());
  }

  addLeg(from: LatLon, to: LatLon): void {
    const positions = arc(from, to);
    const material = Material.fromType(Material.PolylineDashType, { color: Color.fromCssColorString(PALETTE.route), gapColor: Color.TRANSPARENT, dashLength: 14 });
    const line = this.lines.add({ positions: positions.slice(0, 2), width: 2.5, material });
    if (reducedMotion()) {
      line.positions = positions;
      this.viewer.scene.requestRender();
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = () => {
      this.frames.delete(frame);
      if (this.lines.isDestroyed() || !this.lines.contains(line)) return;
      const t = Math.min((performance.now() - start) / DRAW_MS, 1);
      const eased = 1 - (1 - t) ** 3;
      line.positions = positions.slice(0, Math.max(2, Math.round(eased * SEGMENTS) + 1));
      this.viewer.scene.requestRender();
      if (t < 1) this.frames.add((frame = requestAnimationFrame(step)));
    };
    this.frames.add((frame = requestAnimationFrame(step)));
  }

  clear(): void {
    this.frames.forEach(cancelAnimationFrame);
    this.frames.clear();
    if (this.lines.isDestroyed()) return;
    this.lines.removeAll();
    this.viewer.scene.requestRender();
  }

  destroy(): void {
    this.clear();
    if (!this.lines.isDestroyed()) this.viewer.scene.primitives.remove(this.lines);
  }
}
