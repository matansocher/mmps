import { CameraEventType, Cesium3DTileset, Color, createGooglePhotorealistic3DTileset, DynamicAtmosphereLightingType, GoogleMaps, KeyboardEventModifier, ScreenSpaceEventType, Viewer } from 'cesium';

export type EarthViewer = {
  readonly viewer: Viewer;
  readonly tileset: Cesium3DTileset | null;
  readonly tilesetError: string | null;
};

export async function createEarthViewer(container: HTMLElement, key: string): Promise<EarthViewer> {
  GoogleMaps.defaultApiKey = key;

  const viewer = new Viewer(container, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    baseLayer: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    msaaSamples: 4,
    useBrowserRecommendedResolution: false,
  });

  // Crisp on retina, but never render more than 2x CSS pixels.
  const dpr = window.devicePixelRatio || 1;
  viewer.resolutionScale = Math.min(dpr, 2) / dpr;

  const { scene } = viewer;
  scene.globe.baseColor = Color.fromCssColorString('#0b1e3a');
  scene.globe.showGroundAtmosphere = true;
  scene.globe.depthTestAgainstTerrain = true;
  if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT;
  scene.backgroundColor = Color.BLACK;
  if (scene.skyBox) scene.skyBox.show = true;
  if (scene.sun) scene.sun.show = true;
  if (scene.moon) scene.moon.show = false;

  const controller = scene.screenSpaceCameraController;
  controller.minimumZoomDistance = 5;
  controller.maximumZoomDistance = 60_000_000;
  controller.inertiaSpin = 0.93;
  controller.inertiaTranslate = 0.93;
  controller.inertiaZoom = 0.85;
  controller.tiltEventTypes = [
    CameraEventType.MIDDLE_DRAG,
    CameraEventType.PINCH,
    { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
    { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.SHIFT },
  ];

  // We own click/double-click behavior (no entity tracking).
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);

  viewer.clock.shouldAnimate = false;

  let tileset: Cesium3DTileset | null = null;
  let tilesetError: string | null = null;
  try {
    tileset = await createGooglePhotorealistic3DTileset(
      { key, onlyUsingWithGoogleGeocoder: true },
      {
        showCreditsOnScreen: true,
        enableCollision: true,
        cacheBytes: 1024 * 1024 * 1024,
        maximumCacheOverflowBytes: 512 * 1024 * 1024,
        maximumScreenSpaceError: 16,
        dynamicScreenSpaceError: true,
        foveatedScreenSpaceError: true,
        preloadFlightDestinations: true,
      },
    );
    scene.primitives.add(tileset);
  } catch (err) {
    tilesetError = err instanceof Error ? err.message : String(err);
  }

  return { viewer, tileset, tilesetError };
}
