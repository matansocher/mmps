import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorScreen, Splash } from './components/Overlays';
import { HOME_VIEW, setView } from './globe/camera';
import { createEngine, type EarthEngine, isWebGLAvailable } from './globe/engine';
import { EarthUi } from './EarthUi';

type Boot =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly title: string; readonly message: string; readonly retryable: boolean }
  | { readonly status: 'ready'; readonly engine: EarthEngine };

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setBoot({ status: 'error', title: 'Your browser can’t show the 3D globe', message: 'This game needs WebGL. Try a recent version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is turned on.', retryable: false });
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let engine: EarthEngine | null = null;

    void (async () => {
      try {
        engine = await createEngine(container);
        if (cancelled) {
          engine.destroy();
          return;
        }
        setView(engine.viewer, HOME_VIEW);
        setBoot({ status: 'ready', engine });
      } catch (err) {
        if (cancelled) return;
        engine?.destroy();
        engine = null;
        setBoot({ status: 'error', title: 'Couldn’t load the globe', message: err instanceof Error ? err.message : 'Something went wrong.', retryable: true });
      }
    })();

    return () => {
      cancelled = true;
      engine?.destroy();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setBoot({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  return (
    <>
      <div ref={containerRef} className="fixed inset-0" />
      {boot.status === 'ready' && <EarthUi engine={boot.engine} />}
      <Splash visible={boot.status === 'loading'} />
      {boot.status === 'error' && <ErrorScreen title={boot.title} message={boot.message} onRetry={boot.retryable ? retry : undefined} />}
    </>
  );
}
