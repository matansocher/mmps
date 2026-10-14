import {
  ArcType,
  Cartesian3,
  Math as CesiumMath,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  PerInstanceColorAppearance,
  PolygonGeometry,
  PolygonHierarchy,
  Primitive,
  SimplePolylineGeometry,
  type Viewer,
} from 'cesium';
import type { Country, Ring } from '../types';
import { PALETTE } from './colors';

const LAND_COLOR = PALETTE.land;
const GRATICULE_STEP = 15;

// Slightly above the ellipsoid so land never z-fights with the ocean, borders above land.
const LAND_HEIGHT = 2_000;
const BORDER_HEIGHT = 4_000;
const GRATICULE_HEIGHT = 500;

const toPositions = (ring: Ring, height: number) => {
  const coords: number[] = [];
  for (let i = 0; i < ring.length; i += 2) coords.push(ring[i], ring[i + 1], height);
  return Cartesian3.fromDegreesArrayHeights(coords);
};

// Faint latitude/longitude lines on the sea, like a navigation chart. Land is drawn over them.
function graticule(): GeometryInstance[] {
  const color = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(PALETTE.graticule));
  const line = (coords: number[]) =>
    new GeometryInstance({
      geometry: new SimplePolylineGeometry({ positions: Cartesian3.fromDegreesArrayHeights(coords), arcType: ArcType.RHUMB, granularity: CesiumMath.RADIANS_PER_DEGREE }),
      attributes: { color },
    });
  const lines: GeometryInstance[] = [];
  for (let lon = -180; lon < 180; lon += GRATICULE_STEP) lines.push(line([lon, -80, GRATICULE_HEIGHT, lon, 0, GRATICULE_HEIGHT, lon, 80, GRATICULE_HEIGHT]));
  for (let lat = -75; lat <= 75; lat += GRATICULE_STEP) lines.push(line([-180, lat, GRATICULE_HEIGHT, -60, lat, GRATICULE_HEIGHT, 60, lat, GRATICULE_HEIGHT, 180, lat, GRATICULE_HEIGHT]));
  return lines;
}

export class CountriesLayer {
  private readonly land: Primitive;
  private readonly borders: Primitive;
  private readonly instanceIds = new Map<string, string[]>();
  private readonly colors = new Map<string, string>();
  private readonly viewer: Viewer;

  constructor(viewer: Viewer, countries: readonly Country[]) {
    this.viewer = viewer;
    const landColor = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(LAND_COLOR));
    const borderColor = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(PALETTE.border));
    const landInstances: GeometryInstance[] = [];
    const borderInstances: GeometryInstance[] = graticule();

    for (const country of countries) {
      const ids: string[] = [];
      country.polygons.forEach(([outer, ...holes], i) => {
        const id = `${country.code}:${i}`;
        ids.push(id);
        const hierarchy = new PolygonHierarchy(
          toPositions(outer, 0),
          holes.map((hole) => new PolygonHierarchy(toPositions(hole, 0))),
        );
        landInstances.push(
          new GeometryInstance({
            id,
            geometry: new PolygonGeometry({
              polygonHierarchy: hierarchy,
              height: LAND_HEIGHT,
              granularity: CesiumMath.RADIANS_PER_DEGREE / 2,
              vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
            }),
            attributes: { color: landColor },
          }),
        );
        for (const ring of [outer, ...holes]) {
          const positions = toPositions([...ring, ring[0], ring[1]], BORDER_HEIGHT);
          borderInstances.push(
            new GeometryInstance({
              geometry: new SimplePolylineGeometry({ positions, arcType: ArcType.GEODESIC, granularity: CesiumMath.RADIANS_PER_DEGREE / 2 }),
              attributes: { color: borderColor },
            }),
          );
        }
      });
      this.instanceIds.set(country.code, ids);
    }

    this.land = viewer.scene.primitives.add(
      new Primitive({ geometryInstances: landInstances, appearance: new PerInstanceColorAppearance({ flat: true, translucent: false }), releaseGeometryInstances: true }),
    );
    this.borders = viewer.scene.primitives.add(
      new Primitive({ geometryInstances: borderInstances, appearance: new PerInstanceColorAppearance({ flat: true, translucent: false }), releaseGeometryInstances: true }),
    );
  }

  // Resolves once both primitives are built (they tessellate in web workers).
  whenReady(): Promise<void> {
    const { scene } = this.viewer;
    return new Promise((resolve) => {
      const check = () => {
        if (this.land.isDestroyed() || (this.land.ready && this.borders.ready)) {
          remove();
          this.applyColors();
          resolve();
        } else {
          scene.requestRender();
        }
      };
      const remove = scene.postRender.addEventListener(check);
      scene.requestRender();
    });
  }

  // Pass null to restore the default land color.
  setColor(code: string, color: string | null): void {
    if (color) this.colors.set(code, color);
    else this.colors.delete(code);
    this.paint(code, color ?? LAND_COLOR);
    this.viewer.scene.requestRender();
  }

  resetColors(): void {
    const codes = [...this.colors.keys()];
    this.colors.clear();
    codes.forEach((code) => this.paint(code, LAND_COLOR));
    this.viewer.scene.requestRender();
  }

  destroy(): void {
    const { primitives } = this.viewer.scene;
    if (!this.land.isDestroyed()) primitives.remove(this.land);
    if (!this.borders.isDestroyed()) primitives.remove(this.borders);
  }

  private applyColors(): void {
    this.colors.forEach((color, code) => this.paint(code, color));
  }

  private paint(code: string, color: string): void {
    if (!this.land.ready || this.land.isDestroyed()) return;
    const value = ColorGeometryInstanceAttribute.toValue(Color.fromCssColorString(color));
    for (const id of this.instanceIds.get(code) ?? []) {
      const attributes = this.land.getGeometryInstanceAttributes(id);
      if (attributes) attributes.color = value;
    }
  }
}
