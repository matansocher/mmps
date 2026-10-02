import { type Cesium3DTileset, Google2DImageryProvider, ImageryLayer, type ImageryProvider, type Viewer } from 'cesium';
import type { MapStyle } from '../types';

type LayerKey = 'satellite' | 'roadmap' | 'labels';

export class MapStyleController {
  private readonly layers = new Map<LayerKey, ImageryLayer>();
  private requestId = 0;

  private readonly viewer: Viewer;
  private readonly tileset: Cesium3DTileset | null;

  constructor(viewer: Viewer, tileset: Cesium3DTileset | null) {
    this.viewer = viewer;
    this.tileset = tileset;
  }

  get hasPhotorealistic(): boolean {
    return this.tileset !== null;
  }

  async apply(style: MapStyle): Promise<MapStyle> {
    const requestId = ++this.requestId;
    const effective: MapStyle = style === 'photorealistic' && !this.tileset ? 'satellite' : style;
    const { scene } = this.viewer;

    if (this.tileset) this.tileset.show = effective === 'photorealistic';
    scene.globe.show = effective !== 'photorealistic';

    const wanted: LayerKey[] = effective === 'satellite' ? ['satellite'] : effective === 'hybrid' ? ['satellite', 'labels'] : effective === 'roadmap' ? ['roadmap'] : [];
    for (const [key, layer] of this.layers) layer.show = wanted.includes(key);

    for (const key of wanted) {
      if (this.layers.has(key)) continue;
      const layer = await this.createLayer(key);
      if (requestId !== this.requestId) {
        layer.show = false;
      }
      this.layers.set(key, layer);
      if (key === 'labels') this.viewer.imageryLayers.add(layer);
      else this.viewer.imageryLayers.add(layer, 0);
      layer.show = requestId === this.requestId && wanted.includes(key);
    }
    scene.requestRender();
    return effective;
  }

  private async createLayer(key: LayerKey): Promise<ImageryLayer> {
    const provider =
      key === 'labels'
        ? await Google2DImageryProvider.fromUrl({ overlayLayerType: 'layerRoadmap', language: navigator.language || 'en-US' })
        : await Google2DImageryProvider.fromUrl({ mapType: key, language: navigator.language || 'en-US' });
    // Cesium's typings for Google2DImageryProvider predate ImageryProvider's getTileCredits signature.
    return new ImageryLayer(provider as unknown as ImageryProvider);
  }
}
