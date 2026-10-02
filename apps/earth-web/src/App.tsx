import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorScreen, Splash } from './components/Overlays';
import { HOME_VIEW, setView } from './globe/camera';
import { createEngine, isWebGLAvailable, type EarthEngine } from './globe/engine';
import { EarthUi } from './EarthUi';
import { fetchEarthConfig } from './lib/config';
import { decodeView } from './lib/url-state';
import type { EarthConfig } from './types';

type Boot =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly title: string; readonly message: string; readonly retryable: boolean }
  | { readonly status: 'ready'; readonly engine: EarthEngine; readonly config: EarthConfig };

const SPLASH_TIMEOUT_MS = 9000;

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });
  const [progress, setProgress] = useState(0.05);
  const [splash, setSplash] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setBoot({ status: 'error', title: 'Your browser can’t show the 3D globe', message: 'Earth needs WebGL. Try a recent version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is turned on.', retryable: false });
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let engine: EarthEngine | null = null;
    const cleanups: Array<() => void> = [];

    void (async () => {
      try {
        const config = await fetchEarthConfig();
        if (cancelled) return;
        setProgress(0.25);
        engine = await createEngine(container, config.googleMapsKey);
        if (cancelled) {
          engine.destroy();
          return;
        }
        setProgress(0.45);
        setView(engine.viewer, decodeView(window.location.hash) ?? HOME_VIEW);

        let maxPending = 1;
        const finish = () => {
          setProgress(1);
          window.setTimeout(() => setSplash(false), 250);
        };
        const timer = window.setTimeout(finish, SPLASH_TIMEOUT_MS);
        cleanups.push(() => window.clearTimeout(timer));
        if (engine.tileset) {
          const tileset = engine.tileset;
          cleanups.push(
            tileset.loadProgress.addEventListener((pending: number, processing: number) => {
              const total = pending + processing;
              maxPending = Math.max(maxPending, total);
              setProgress((p) => Math.max(p, 0.45 + 0.5 * (1 - total / maxPending)));
            }),
          );
          cleanups.push(tileset.initialTilesLoaded.addEventListener(finish));
        } else {
          cleanups.push(
            engine.viewer.scene.globe.tileLoadProgressEvent.addEventListener((queued: number) => {
              maxPending = Math.max(maxPending, queued);
              setProgress((p) => Math.max(p, 0.45 + 0.5 * (1 - queued / maxPending)));
              if (queued === 0) finish();
            }),
          );
        }
        setBoot({ status: 'ready', engine, config });
      } catch (err) {
        if (cancelled) return;
        engine?.destroy();
        engine = null;
        setBoot({ status: 'error', title: 'Couldn’t load Earth', message: err instanceof Error ? err.message : 'Something went wrong.', retryable: true });
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      engine?.destroy();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setBoot({ status: 'loading' });
    setSplash(true);
    setProgress(0.05);
    setAttempt((a) => a + 1);
  }, []);

  return (
    <>
      <div ref={containerRef} className="fixed inset-0" />
      {boot.status === 'ready' && <EarthUi engine={boot.engine} config={boot.config} />}
      <Splash visible={splash && boot.status !== 'error'} progress={progress} />
      {boot.status === 'error' && <ErrorScreen title={boot.title} message={boot.message} onRetry={boot.retryable ? retry : undefined} />}
    </>
  );
}
