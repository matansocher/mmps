import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/maps';
import { getMapStyles, getPinSymbol } from '../lib/cosmetic-rendering';
import type { RoundResult } from '../types';

export function RoundResultMap({ result, mapThemeId, pinId }: { readonly result: RoundResult; readonly mapThemeId?: string; readonly pinId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const overlays: Array<google.maps.Marker | google.maps.Polyline | google.maps.Circle> = [];
    void loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current) return;
        const map = new maps.maps.Map(containerRef.current, {
          center: result.actual,
          zoom: 8,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          styles: getMapStyles(mapThemeId),
        });
        const color = result.circleHit ? '#16A34A' : '#DC2626';
        const circle = new maps.maps.Circle({
          map,
          center: result.guess,
          radius: result.circleRadiusKm * 1_000,
          clickable: false,
          strokeColor: color,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          fillColor: color,
          fillOpacity: 0.18,
        });
        overlays.push(
          circle,
          new maps.maps.Marker({ map, position: result.guess, icon: getPinSymbol(maps, pinId), title: 'Your circle center' }),
          new maps.maps.Marker({ map, position: result.actual, label: { text: 'A', color: '#FFFFFF', fontWeight: '700' }, title: 'Actual location' }),
          new maps.maps.Polyline({ map, path: [result.guess, result.actual], strokeColor: color, strokeOpacity: 0.9, strokeWeight: 4 }),
        );
        const bounds = circle.getBounds() ?? new maps.maps.LatLngBounds();
        bounds.extend(result.actual);
        map.fitBounds(bounds, 48);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Result map failed to load');
      });
    return () => {
      active = false;
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [mapThemeId, pinId, result]);

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl bg-geo-surface">
      <div ref={containerRef} className="h-full w-full" aria-label={`Map showing a ${result.circleHit ? 'successful' : 'missed'} confidence circle and the actual location`} />
      {error ? <div className="absolute inset-0 grid place-items-center bg-geo-surface p-4 text-center text-geo-muted">{error}</div> : null}
    </div>
  );
}
