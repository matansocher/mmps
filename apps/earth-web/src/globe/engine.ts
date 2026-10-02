import type { Viewer } from 'cesium';
import { type CountryIndex, createCountryIndex, loadCountries } from '../game/countries';
import { CountriesLayer } from './countries-layer';
import { RouteLayer } from './route-layer';
import { createEarthViewer } from './viewer';

export type EarthEngine = {
  readonly viewer: Viewer;
  readonly countries: CountryIndex;
  readonly layer: CountriesLayer;
  readonly route: RouteLayer;
  readonly destroy: () => void;
};

export async function createEngine(container: HTMLElement): Promise<EarthEngine> {
  const countries = await loadCountries();
  const viewer = createEarthViewer(container);
  const layer = new CountriesLayer(viewer, countries);
  const route = new RouteLayer(viewer);
  const destroy = () => {
    route.destroy();
    layer.destroy();
    if (!viewer.isDestroyed()) viewer.destroy();
  };
  try {
    await layer.whenReady();
  } catch (err) {
    destroy();
    throw err;
  }
  return { viewer, countries: createCountryIndex(countries), layer, route, destroy };
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
