import { useEffect } from 'react';
import { flyToView, getCameraView } from '../globe/camera';
import type { EarthEngine } from '../globe/engine';
import { decodeView, encodeView } from '../lib/url-state';

export function useUrlSync(engine: EarthEngine | null): void {
  useEffect(() => {
    if (!engine) return;
    const { viewer } = engine;
    let lastHash = window.location.hash;
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      const hash = `#${encodeView(getCameraView(viewer))}`;
      if (hash === lastHash) return;
      lastHash = hash;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    });
    const onHashChange = () => {
      if (window.location.hash === lastHash) return;
      const view = decodeView(window.location.hash);
      lastHash = window.location.hash;
      if (view) void flyToView(viewer, view);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      removeMoveEnd();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [engine]);
}
