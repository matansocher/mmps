import { Color, ScreenSpaceEventType, Viewer } from 'cesium';
import { MAX_ALTITUDE, MIN_ALTITUDE } from './camera';

export const OCEAN_COLOR = '#1f5fa8';

export function createEarthViewer(container: HTMLElement): Viewer {
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
  scene.globe.baseColor = Color.fromCssColorString(OCEAN_COLOR);
  scene.globe.showGroundAtmosphere = false;
  scene.globe.enableLighting = false;
  scene.fog.enabled = false;
  if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
  scene.backgroundColor = Color.BLACK;
  if (scene.skyBox) scene.skyBox.show = true;
  if (scene.sun) scene.sun.show = false;
  if (scene.moon) scene.moon.show = false;
  viewer.cesiumWidget.creditContainer.remove();

  // A flat map game: spin and zoom only, always looking straight down.
  const controller = scene.screenSpaceCameraController;
  controller.enableTilt = false;
  controller.enableLook = false;
  controller.minimumZoomDistance = MIN_ALTITUDE;
  controller.maximumZoomDistance = MAX_ALTITUDE;
  controller.inertiaSpin = 0.93;
  controller.inertiaTranslate = 0.93;
  controller.inertiaZoom = 0.85;

  // The game owns clicks; no entity selection or double-click tracking.
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
  viewer.clock.shouldAnimate = false;

  return viewer;
}
