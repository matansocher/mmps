import { Cartesian2, Cartesian3, Color, CustomDataSource, HeightReference, HorizontalOrigin, LabelStyle, NearFarScalar, VerticalOrigin, type Viewer } from 'cesium';
import type { Placemark } from '../types';

const pinCache = new Map<string, string>();

function pinImage(color: string): string {
  const cached = pinCache.get(color);
  if (cached) return cached;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 43 16 43s15-16 15-27.2C31 7.6 24.3 1 16 1z" fill="${color}" stroke="#000" stroke-opacity=".45" stroke-width="1.5"/><circle cx="16" cy="15.5" r="5.5" fill="#fff" fill-opacity=".92"/></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  pinCache.set(color, url);
  return url;
}

export const PLACEMARK_ENTITY_PREFIX = 'pm:';

export class PlacemarksLayer {
  private readonly source = new CustomDataSource('placemarks');

  private readonly viewer: Viewer;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    void viewer.dataSources.add(this.source);
  }

  sync(placemarks: readonly Placemark[], selectedId: string | null): void {
    const entities = this.source.entities;
    entities.suspendEvents();
    entities.removeAll();
    for (const p of placemarks) {
      const selected = p.id === selectedId;
      entities.add({
        id: PLACEMARK_ENTITY_PREFIX + p.id,
        position: Cartesian3.fromDegrees(p.lon, p.lat, p.height),
        billboard: {
          image: pinImage(p.color),
          width: selected ? 30 : 24,
          height: selected ? 41 : 33,
          verticalOrigin: VerticalOrigin.BOTTOM,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new NearFarScalar(1_000, 1, 20_000_000, 0.6),
        },
        label: {
          text: p.name,
          font: `${selected ? '600 ' : ''}13px Inter, system-ui, sans-serif`,
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK.withAlpha(0.85),
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: HorizontalOrigin.LEFT,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian2(14, -18),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          translucencyByDistance: new NearFarScalar(2_000_000, 1, 12_000_000, 0),
        },
      });
    }
    entities.resumeEvents();
    this.viewer.scene.requestRender();
  }

  destroy(): void {
    this.viewer.dataSources.remove(this.source, true);
  }
}
