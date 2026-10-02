import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  ClassificationType,
  Color,
  CustomDataSource,
  HeightReference,
  PolygonHierarchy,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer,
} from 'cesium';
import { pickCartesian, toPickedPoint } from '../globe/pick';
import { pathDistance, polygonArea } from '../lib/geo';
import type { LatLon } from '../types';

export type MeasureMode = 'line' | 'area';

export type MeasureResult = {
  readonly mode: MeasureMode;
  readonly points: number;
  readonly distance: number; // meters (path length, or perimeter for area)
  readonly area: number; // square meters
};

const ACCENT = Color.fromCssColorString('#fbbc04');

export class MeasureTool {
  private readonly source = new CustomDataSource('measure');
  private handler: ScreenSpaceEventHandler | null = null;
  private positions: Cartesian3[] = [];
  private hover: Cartesian3 | null = null;
  private mode: MeasureMode = 'line';

  private readonly viewer: Viewer;
  private readonly onChange: (result: MeasureResult) => void;

  constructor(viewer: Viewer, onChange: (result: MeasureResult) => void) {
    this.viewer = viewer;
    this.onChange = onChange;
    void viewer.dataSources.add(this.source);
  }

  start(mode: MeasureMode): void {
    this.stop();
    this.mode = mode;
    this.clear();
    this.buildShapes();
    const handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    handler.setInputAction((e: { position: Cartesian2 }) => this.addPoint(e.position), ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction((e: { endPosition: Cartesian2 }) => {
      this.hover = pickCartesian(this.viewer, e.endPosition) ?? null;
      this.viewer.scene.requestRender();
    }, ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(() => this.undo(), ScreenSpaceEventType.RIGHT_CLICK);
    this.handler = handler;
    this.viewer.scene.canvas.style.cursor = 'crosshair';
    this.emit();
  }

  stop(): void {
    this.handler?.destroy();
    this.handler = null;
    this.hover = null;
    this.viewer.scene.canvas.style.cursor = '';
    this.viewer.scene.requestRender();
  }

  clear(): void {
    this.positions = [];
    this.hover = null;
    this.source.entities.removeAll();
    if (this.handler) this.buildShapes();
    this.emit();
  }

  undo(): void {
    if (this.positions.length === 0) return;
    this.positions.pop();
    this.source.entities.removeById(`v${this.positions.length}`);
    this.emit();
  }

  destroy(): void {
    this.stop();
    this.viewer.dataSources.remove(this.source, true);
  }

  private addPoint(position: Cartesian2): void {
    const cartesian = pickCartesian(this.viewer, position);
    if (!cartesian) return;
    this.source.entities.add({
      id: `v${this.positions.length}`,
      position: cartesian,
      point: { pixelSize: 9, color: Color.WHITE, outlineColor: ACCENT, outlineWidth: 2.5, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    });
    this.positions.push(cartesian);
    this.emit();
  }

  private livePositions(closed: boolean): Cartesian3[] {
    const list = this.hover && this.handler ? [...this.positions, this.hover] : [...this.positions];
    if (closed && list.length > 2) list.push(list[0]);
    return list;
  }

  private buildShapes(): void {
    const isArea = this.mode === 'area';
    this.source.entities.add({
      id: 'line',
      polyline: {
        positions: new CallbackProperty(() => this.livePositions(isArea), false),
        width: 3,
        material: ACCENT,
        clampToGround: true,
        classificationType: ClassificationType.BOTH,
      },
    });
    if (isArea) {
      this.source.entities.add({
        id: 'area',
        polygon: {
          hierarchy: new CallbackProperty(() => new PolygonHierarchy(this.livePositions(false)), false),
          material: ACCENT.withAlpha(0.25),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          classificationType: ClassificationType.BOTH,
        },
      });
    }
  }

  private emit(): void {
    const points: LatLon[] = this.positions.map(toPickedPoint);
    const closed = this.mode === 'area' && points.length > 2 ? [...points, points[0]] : points;
    this.onChange({
      mode: this.mode,
      points: points.length,
      distance: pathDistance(closed),
      area: this.mode === 'area' && points.length > 2 ? polygonArea(points) : 0,
    });
    this.viewer.scene.requestRender();
  }
}
