import { useEffect, useState } from 'react';
import { getCameraView } from '../globe/camera';
import type { EarthEngine } from '../globe/engine';
import { metersPerPixel } from '../globe/pick';
import type { CameraView } from '../types';

export type CameraState = CameraView & { readonly metersPerPixel: number | null };

export function useCameraState(engine: EarthEngine | null): CameraState | null {
  const [state, setState] = useState<CameraState | null>(null);
  useEffect(() => {
    if (!engine) return;
    const { viewer } = engine;
    let last = '';
    const update = () => {
      const view = getCameraView(viewer);
      const key = `${view.lat.toFixed(5)}|${view.lon.toFixed(5)}|${Math.round(view.altitude)}|${view.heading.toFixed(1)}|${view.pitch.toFixed(1)}|${viewer.scene.canvas.clientWidth}`;
      if (key === last) return;
      last = key;
      setState({ ...view, metersPerPixel: metersPerPixel(viewer) });
    };
    update();
    return viewer.scene.postRender.addEventListener(update);
  }, [engine]);
  return state;
}
