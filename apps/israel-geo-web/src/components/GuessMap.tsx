import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/maps';
import { maximumCircleScore } from '../lib/scoring';
import { getMapStyles, getPinSymbol } from '../lib/cosmetic-rendering';
import type { Coordinates } from '../types';

const ISRAEL_CENTER = { lat: 31.75, lng: 34.95 };
const ISRAEL_BOUNDS = { north: 33.4, south: 29.35, west: 34.2, east: 35.95 };
const DEFAULT_RADIUS_KM = 25;

export function GuessMap({
  onConfirm,
  onCancel,
  submitting,
  mapThemeId,
  pinId,
}: {
  readonly onConfirm: (coordinates: Coordinates, radiusKm: number) => void;
  readonly onCancel: () => void;
  readonly submitting: boolean;
  readonly mapThemeId?: string;
  readonly pinId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker>();
  const circleRef = useRef<google.maps.Circle>();
  const [guess, setGuess] = useState<Coordinates>();
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current) return;
        const map = new maps.maps.Map(containerRef.current, {
          center: ISRAEL_CENTER,
          zoom: 7,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          restriction: { latLngBounds: ISRAEL_BOUNDS, strictBounds: false },
          styles: getMapStyles(mapThemeId),
        });
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          const coordinates = { lat: event.latLng.lat(), lng: event.latLng.lng() };
          setGuess(coordinates);
          if (!markerRef.current) {
            markerRef.current = new maps.maps.Marker({
              map,
              position: coordinates,
              animation: maps.maps.Animation.DROP,
              title: 'Confidence circle center',
              icon: getPinSymbol(maps, pinId),
            });
          } else {
            markerRef.current.setPosition(coordinates);
          }
          if (!circleRef.current) {
            circleRef.current = new maps.maps.Circle({
              map,
              center: coordinates,
              radius: DEFAULT_RADIUS_KM * 1_000,
              clickable: false,
              strokeColor: '#F97316',
              strokeOpacity: 0.95,
              strokeWeight: 3,
              fillColor: '#F97316',
              fillOpacity: 0.2,
            });
          } else {
            circleRef.current.setCenter(coordinates);
          }
        });
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Map failed to load');
      });
    return () => {
      active = false;
      markerRef.current?.setMap(null);
      circleRef.current?.setMap(null);
    };
  }, [mapThemeId, pinId]);

  function updateRadius(nextRadiusKm: number): void {
    setRadiusKm(nextRadiusKm);
    circleRef.current?.setRadius(nextRadiusKm * 1_000);
  }

  return (
    <div className="fixed inset-0 z-40 flex min-h-dvh flex-col bg-geo-night">
      <header className="flex items-center justify-between gap-4 border-b border-geo-line bg-geo-night px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl px-3 font-bold text-geo-muted transition hover:bg-geo-surface hover:text-white focus:outline-none focus:ring-2 focus:ring-geo-orange"
        >
          Back
        </button>
        <div className="text-center">
          <p className="font-display text-xl">Draw your confidence circle</p>
          <p className="text-xs text-geo-muted">Smaller circles earn more</p>
        </div>
        <div className="w-16" aria-hidden="true" />
      </header>
      <div ref={containerRef} className="min-h-0 flex-1" aria-label="Map of Israel for drawing a confidence circle" />
      {error ? <p className="bg-geo-danger px-4 py-3 text-center font-bold">{error}</p> : null}
      <div className="safe-b border-t border-geo-line bg-geo-night p-4">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor="confidence-radius" className="font-bold">
              Circle radius
            </label>
            <div className="text-right">
              <output htmlFor="confidence-radius" className="font-display text-xl text-geo-orange">
                {radiusKm} km
              </output>
              <p className="text-xs text-geo-muted">Up to {maximumCircleScore(radiusKm).toLocaleString()} pts</p>
            </div>
          </div>
          <input
            id="confidence-radius"
            type="range"
            min="1"
            max="150"
            step="1"
            value={radiusKm}
            disabled={submitting}
            onChange={(event) => updateRadius(Number(event.target.value))}
            className="h-11 w-full cursor-pointer accent-geo-orange disabled:cursor-not-allowed"
          />
          <div className="-mt-2 flex justify-between text-xs text-geo-muted" aria-hidden="true">
            <span>1 km</span>
            <span>150 km</span>
          </div>
        </div>
        <button
          type="button"
          disabled={!guess || submitting}
          onClick={() => guess && onConfirm(guess, radiusKm)}
          className="min-h-12 w-full rounded-2xl bg-geo-orange px-5 py-3 font-display text-xl text-white shadow-action transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Scoring circle...' : guess ? `Lock ${radiusKm} km circle` : 'Tap the map to choose a center'}
        </button>
      </div>
    </div>
  );
}
