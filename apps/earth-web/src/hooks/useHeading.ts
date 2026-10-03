import { Math as CesiumMath } from 'cesium';
import { useEffect, useState } from 'react';
import type { EarthEngine } from '../globe/engine';

// Camera heading in degrees (for the compass), updated after each render.
export function useHeading(engine: EarthEngine): number {
  const [heading, setHeading] = useState(0);
  useEffect(() => {
    const { viewer } = engine;
    const update = () => setHeading(Math.round(CesiumMath.toDegrees(viewer.camera.heading) * 10) / 10);
    update();
    return viewer.scene.postRender.addEventListener(update);
  }, [engine]);
  return heading;
}
