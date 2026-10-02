import {
  ArcType,
  Cartesian2,
  Cartesian3,
  ClassificationType,
  Color,
  ColorGeometryInstanceAttribute,
  DistanceDisplayCondition,
  Ellipsoid,
  EllipsoidalOccluder,
  GeometryInstance,
  GroundPolylineGeometry,
  GroundPolylinePrimitive,
  HorizontalOrigin,
  type Label,
  LabelCollection,
  LabelStyle,
  NearFarScalar,
  type PointPrimitive,
  PointPrimitiveCollection,
  PolylineColorAppearance,
  SceneTransforms,
  VerticalOrigin,
  type Viewer,
} from 'cesium';

type LabelsData = {
  readonly countries: ReadonlyArray<readonly [string, number, number, number]>; // name, lat, lon, labelrank
  readonly cities: ReadonlyArray<readonly [string, number, number, number, number, number]>; // name, lat, lon, scalerank, pop, isCapital
};

type BordersData = ReadonlyArray<readonly number[]>; // flat [lon, lat, lon, lat, ...]

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

function countryFar(rank: number): number {
  if (rank <= 2) return 30_000_000;
  if (rank <= 4) return 14_000_000;
  return 7_000_000;
}

function cityFar(rank: number): number {
  if (rank <= 1) return 7_000_000;
  if (rank <= 3) return 3_500_000;
  if (rank <= 5) return 1_800_000;
  if (rank <= 7) return 900_000;
  return 450_000;
}

type Placed = {
  readonly position: Cartesian3;
  readonly label: Label;
  readonly point?: PointPrimitive;
  readonly priority: number; // lower wins when labels collide
  readonly near: number;
  readonly far: number;
  readonly width: number; // approximate px
  readonly anchor: 'center' | 'left';
};

const LABEL_HEIGHT_PX = 16;
const LABEL_GAP_PX = 6;

export class OverlayController {
  private labels: LabelCollection | null = null;
  private points: PointPrimitiveCollection | null = null;
  private placed: Placed[] = [];
  private borders: GroundPolylinePrimitive | null = null;
  private grid: GroundPolylinePrimitive | null = null;
  private labelsVisible = false;
  private removeCameraListener: (() => void) | null = null;

  private readonly viewer: Viewer;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
  }

  async setLabels(visible: boolean): Promise<void> {
    this.labelsVisible = visible;
    if (visible && !this.labels) await this.loadLabels();
    if (this.labels) this.labels.show = visible;
    if (this.points) this.points.show = visible;
    if (visible) this.updateHorizonCulling();
    this.viewer.scene.requestRender();
  }

  async setBorders(visible: boolean): Promise<void> {
    if (visible && !this.borders) {
      const lines = (await (await fetch(dataUrl('borders.json'))).json()) as BordersData;
      this.borders = this.viewer.scene.groundPrimitives.add(
        new GroundPolylinePrimitive({
          geometryInstances: lines
            .filter((l) => l.length >= 4)
            .map(
              (flat) =>
                new GeometryInstance({
                  geometry: new GroundPolylineGeometry({ positions: Cartesian3.fromDegreesArray(flat as number[]), width: 1.6, arcType: ArcType.GEODESIC }),
                  attributes: { color: ColorGeometryInstanceAttribute.fromColor(Color.fromCssColorString('#fde68a').withAlpha(0.8)) },
                }),
            ),
          appearance: new PolylineColorAppearance(),
          classificationType: ClassificationType.BOTH,
          asynchronous: true,
        }),
      );
    }
    if (this.borders) this.borders.show = visible;
    this.viewer.scene.requestRender();
  }

  setGrid(visible: boolean): void {
    if (visible && !this.grid) {
      const instances: GeometryInstance[] = [];
      const color = (major: boolean) => ColorGeometryInstanceAttribute.fromColor(Color.WHITE.withAlpha(major ? 0.7 : 0.3));
      for (let lon = -180; lon < 180; lon += 15) {
        const positions = Cartesian3.fromDegreesArray([lon, -85, lon, -45, lon, 0, lon, 45, lon, 85]);
        instances.push(new GeometryInstance({ geometry: new GroundPolylineGeometry({ positions, width: 1, arcType: ArcType.GEODESIC }), attributes: { color: color(lon === 0) } }));
      }
      for (let lat = -75; lat <= 75; lat += 15) {
        const flat: number[] = [];
        for (let lon = -180; lon <= 180; lon += 10) flat.push(lon, lat);
        instances.push(
          new GeometryInstance({ geometry: new GroundPolylineGeometry({ positions: Cartesian3.fromDegreesArray(flat), width: 1, arcType: ArcType.RHUMB }), attributes: { color: color(lat === 0) } }),
        );
      }
      this.grid = this.viewer.scene.groundPrimitives.add(
        new GroundPolylinePrimitive({ geometryInstances: instances, appearance: new PolylineColorAppearance(), classificationType: ClassificationType.BOTH, asynchronous: true }),
      );
    }
    if (this.grid) this.grid.show = visible;
    this.viewer.scene.requestRender();
  }

  destroy(): void {
    this.removeCameraListener?.();
  }

  private async loadLabels(): Promise<void> {
    const data = (await (await fetch(dataUrl('labels.json'))).json()) as LabelsData;
    const scene = this.viewer.scene;
    const labels = scene.primitives.add(new LabelCollection({ scene })) as LabelCollection;
    const points = scene.primitives.add(new PointPrimitiveCollection()) as PointPrimitiveCollection;
    const placed: Placed[] = [];

    for (const [name, lat, lon, rank] of data.countries) {
      const position = Cartesian3.fromDegrees(lon, lat, 0);
      const label = labels.add({
        position,
        text: name.toUpperCase(),
        font: '600 13px Inter, system-ui, sans-serif',
        fillColor: Color.fromCssColorString('#fef3c7'),
        outlineColor: Color.BLACK.withAlpha(0.85),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        distanceDisplayCondition: new DistanceDisplayCondition(350_000, countryFar(rank)),
        translucencyByDistance: new NearFarScalar(350_000, 0.0, 700_000, 1.0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      placed.push({ position, label, priority: rank * 2, near: 350_000, far: countryFar(rank), width: name.length * 9, anchor: 'center' });
    }

    for (const [name, lat, lon, rank, , capital] of data.cities) {
      const position = Cartesian3.fromDegrees(lon, lat, 0);
      const far = cityFar(rank);
      const label = labels.add({
        position,
        text: name,
        font: `${capital ? '600 ' : ''}13px Inter, system-ui, sans-serif`,
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK.withAlpha(0.85),
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: HorizontalOrigin.LEFT,
        verticalOrigin: VerticalOrigin.CENTER,
        pixelOffset: new Cartesian2(8, 0),
        distanceDisplayCondition: new DistanceDisplayCondition(0, far),
        translucencyByDistance: new NearFarScalar(far * 0.7, 1.0, far, 0.0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      const point = points.add({
        position,
        pixelSize: capital ? 6 : 5,
        color: capital ? Color.fromCssColorString('#fbbc04') : Color.WHITE,
        outlineColor: Color.BLACK.withAlpha(0.7),
        outlineWidth: 1.5,
        distanceDisplayCondition: new DistanceDisplayCondition(0, far),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
      placed.push({ position, label, point, priority: rank * 2 + (capital ? 0 : 1), near: 0, far, width: name.length * 7 + 8, anchor: 'left' });
    }
    placed.sort((a, b) => a.priority - b.priority);

    this.labels = labels;
    this.points = points;
    this.placed = placed;
    this.removeCameraListener = this.viewer.camera.changed.addEventListener(() => this.updateHorizonCulling());
    this.viewer.camera.percentageChanged = 0.01;
  }

  // Labels ignore depth so they float above 3D buildings: hide the ones behind the planet,
  // then drop lower-priority labels that would overlap ones already placed on screen.
  private updateHorizonCulling(): void {
    if (!this.labelsVisible || this.placed.length === 0) return;
    const { scene, camera } = this.viewer;
    const occluder = new EllipsoidalOccluder(Ellipsoid.WGS84, camera.positionWC);
    const boxes: Array<readonly [number, number, number, number]> = [];
    const screen = new Cartesian2();
    for (const item of this.placed) {
      let visible = occluder.isPointVisible(item.position);
      if (visible) {
        const distance = Cartesian3.distance(camera.positionWC, item.position);
        const inRange = distance >= item.near && distance <= item.far;
        const pos = inRange ? SceneTransforms.worldToWindowCoordinates(scene, item.position, screen) : undefined;
        if (pos) {
          const left = item.anchor === 'center' ? pos.x - item.width / 2 : pos.x - 4;
          const box = [left - LABEL_GAP_PX, pos.y - LABEL_HEIGHT_PX / 2 - LABEL_GAP_PX, left + item.width + LABEL_GAP_PX, pos.y + LABEL_HEIGHT_PX / 2 + LABEL_GAP_PX] as const;
          visible = !boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
          if (visible) boxes.push(box);
        }
      }
      item.label.show = visible;
      if (item.point) item.point.show = visible;
    }
    scene.requestRender();
  }
}
