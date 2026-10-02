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

export const LAND_COLOR = '#f4f5f0';
export const BORDER_COLOR = '#8796a8';

// Slightly above the ellipsoid so land never z-fights with the ocean, borders above land.
const LAND_HEIGHT = 2_000;
const BORDER_HEIGHT = 4_000;

const toPositions = (ring: Ring, height: number) => {
  const coords: number[] = [];
  for (let i = 0; i < ring.length; i += 2) coords.push(ring[i], ring[i + 1], height);
  return Cartesian3.fromDegreesArrayHeights(coords);
};

export class CountriesLayer {
  private readonly land: Primitive;
  private readonly borders: Primitive;
  private readonly instanceIds = new Map<string, string[]>();
  private readonly colors = new Map<string, string>();
  private readonly viewer: Viewer;

  constructor(viewer: Viewer, countries: readonly Country[]) {
    this.viewer = viewer;
    const landColor = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(LAND_COLOR));
    const borderColor = ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString(BORDER_COLOR));
    const landInstances: GeometryInstance[] = [];
    const borderInstances: GeometryInstance[] = [];

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
