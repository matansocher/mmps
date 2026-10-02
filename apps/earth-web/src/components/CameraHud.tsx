import { ScreenSpaceEventHandler, ScreenSpaceEventType, type Cartesian2 } from 'cesium';
import { useEffect, useState } from 'react';
import type { EarthEngine } from '../globe/engine';
import { pickPoint } from '../globe/pick';
import { useCameraState } from '../hooks/useCameraState';
import type { LatLon, Units } from '../types';
import { NavControls } from './NavControls';
import { StatusBar } from './StatusBar';

type Props = {
  readonly engine: EarthEngine;
  readonly units: Units;
  readonly onResetNorth: () => void;
  readonly onToggleTilt: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onMyLocation: () => void;
  readonly locating: boolean;
};

// Re-renders on every camera frame, so it is kept separate from the rest of the UI.
export function CameraHud({ engine, units, ...nav }: Props) {
  const camera = useCameraState(engine);
  const [cursor, setCursor] = useState<(LatLon & { readonly height: number }) | null>(null);

  useEffect(() => {
    const { viewer } = engine;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    let frame = 0;
    let pending: Cartesian2 | null = null;
    handler.setInputAction((e: { endPosition: Cartesian2 }) => {
      pending = e.endPosition.clone();
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pending || viewer.isDestroyed()) return;
        const point = pickPoint(viewer, pending);
        setCursor(point ? { lat: point.lat, lon: point.lon, height: point.height } : null);
      });
    }, ScreenSpaceEventType.MOUSE_MOVE);
    const onLeave = () => setCursor(null);
    viewer.scene.canvas.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      handler.destroy();
      viewer.scene.canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [engine]);
  return (
    <>
      <NavControls heading={camera?.heading ?? 0} pitch={camera?.pitch ?? -90} {...nav} />
      <StatusBar camera={camera} cursor={cursor} units={units} />
    </>
  );
}
