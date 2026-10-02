import { type Cesium3DTileset, JulianDate, type Viewer } from 'cesium';
import { type MeasureResult, MeasureTool } from '../tools/measure';
import { PlacemarksLayer } from '../tools/placemarks-layer';
import type { MapStyle, Settings } from '../types';
import { OverlayController } from './overlays';
import { MapStyleController } from './styles';
import { createEarthViewer } from './viewer';

export type EarthEngine = {
  readonly viewer: Viewer;
  readonly tileset: Cesium3DTileset | null;
  readonly tilesetError: string | null;
  readonly styles: MapStyleController;
  readonly overlays: OverlayController;
  readonly placemarks: PlacemarksLayer;
  readonly measure: MeasureTool;
  readonly measureListeners: Set<(result: MeasureResult) => void>;
  readonly applySettings: (settings: Settings) => Promise<MapStyle>;
  readonly setTimeOfDay: (date: Date | null) => void;
  readonly destroy: () => void;
};

export async function createEngine(container: HTMLElement, key: string): Promise<EarthEngine> {
  const { viewer, tileset, tilesetError } = await createEarthViewer(container, key);
  const styles = new MapStyleController(viewer, tileset);
  const overlays = new OverlayController(viewer);
  const placemarks = new PlacemarksLayer(viewer);
  const measureListeners = new Set<(result: MeasureResult) => void>();
  const measure = new MeasureTool(viewer, (result) => measureListeners.forEach((fn) => fn(result)));

  const applySettings = async (settings: Settings): Promise<MapStyle> => {
    const { scene } = viewer;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = settings.atmosphere;
    scene.globe.showGroundAtmosphere = settings.atmosphere;
    scene.fog.enabled = settings.atmosphere;
    scene.globe.enableLighting = settings.sunLighting;
    scene.light.intensity = 2.0;
    overlays.setGrid(settings.grid);
    await Promise.all([overlays.setLabels(settings.labels), overlays.setBorders(settings.borders)]);
    const effective = await styles.apply(settings.mapStyle);
    scene.requestRender();
    return effective;
  };

  const setTimeOfDay = (date: Date | null) => {
    viewer.clock.currentTime = JulianDate.fromDate(date ?? new Date());
    viewer.scene.requestRender();
  };

  const destroy = () => {
    overlays.destroy();
    measure.destroy();
    placemarks.destroy();
    if (!viewer.isDestroyed()) viewer.destroy();
  };

  return { viewer, tileset, tilesetError, styles, overlays, placemarks, measure, measureListeners, applySettings, setTimeOfDay, destroy };
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
