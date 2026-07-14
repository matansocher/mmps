import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/maps';

export function StreetViewRound({ panoramaId }: { readonly panoramaId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    void loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current) return;
        if (!panoramaRef.current) {
          panoramaRef.current = new maps.maps.StreetViewPanorama(containerRef.current, {
            addressControl: false,
            clickToGo: false,
            disableDefaultUI: true,
            fullscreenControl: false,
            linksControl: false,
            motionTracking: false,
            motionTrackingControl: false,
            panControl: true,
            scrollwheel: true,
            showRoadLabels: false,
            visible: true,
            zoomControl: true,
          });
        }
        panoramaRef.current.setPano(panoramaId);
        panoramaRef.current.setPov({ heading: Math.random() * 360, pitch: 0 });
        panoramaRef.current.setZoom(0);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Street View failed to load');
      });
    return () => {
      active = false;
    };
  }, [panoramaId]);

  return (
    <div className="relative h-full min-h-0 w-full bg-geo-night">
      <div ref={containerRef} className="h-full w-full" aria-label="Interactive Street View panorama" />
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-geo-night p-6 text-center">
          <div>
            <p className="font-display text-2xl">Panorama unavailable</p>
            <p className="mt-2 text-geo-muted">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
