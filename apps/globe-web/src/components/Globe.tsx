import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GlobeGl, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import type { Country, CountryFeature } from '../types';
import { toFeatureCollection } from '../lib/countries';

// Clean political-style palette — no photographic texture so every country
// reads as a distinct, clearly visible shape (this is a guessing game).
const OCEAN_COLOR = '#122d4d';
const LAND_COLOR = 'rgba(96, 130, 176, 0.85)';
const LAND_HOVER_COLOR = 'rgba(120, 200, 255, 0.95)';
const LAND_CORRECT_COLOR = 'rgba(34, 227, 138, 0.95)';
const LAND_WRONG_COLOR = 'rgba(255, 84, 112, 0.95)';
const BORDER_COLOR = 'rgba(10, 22, 42, 0.9)';
const HOVER_BORDER_COLOR = 'rgba(210, 240, 255, 0.95)';
const SIDE_COLOR = 'rgba(18, 45, 77, 0.5)';

// A single flat altitude for every polygon. Extruding polygons on hover was
// what created the huge raised "orange wall" that obscured the map — keep them
// all flush to the surface and highlight purely by color.
const POLYGON_ALTITUDE = 0.008;

const MIN_ALTITUDE = 0.15;
const MAX_ALTITUDE = 2.5;

type Props = {
  readonly countries: readonly Country[];
  readonly hoveredAlpha3: string | null;
  readonly correctAlpha3: string | null;
  readonly wrongAlpha3: string | null;
  readonly onHover: (alpha3: string | null) => void;
  readonly onPick: (country: Country) => void;
  // When set, the globe smoothly flies to center these coordinates.
  readonly flyTo: { readonly lat: number; readonly lon: number } | null;
  readonly interactive: boolean;
};

export function Globe({ countries, hoveredAlpha3, correctAlpha3, wrongAlpha3, onHover, onPick, flyTo, interactive }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const byAlpha3 = useMemo(() => new Map(countries.map((c) => [c.alpha3, c])), [countries]);
  const features = useMemo(() => toFeatureCollection(countries).features as CountryFeature[], [countries]);

  // Flat political ocean material — no satellite texture, so land polygons stand out.
  const globeMaterial = useMemo(() => new MeshPhongMaterial({ color: OCEAN_COLOR, shininess: 6 }), []);

  // Track viewport size so the canvas fills the screen responsively.
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const capColor = useCallback(
    (feat: object) => {
      const alpha3 = (feat as CountryFeature).properties.alpha3;
      if (alpha3 === correctAlpha3) return LAND_CORRECT_COLOR;
      if (alpha3 === wrongAlpha3) return LAND_WRONG_COLOR;
      if (alpha3 === hoveredAlpha3) return LAND_HOVER_COLOR;
      return LAND_COLOR;
    },
    [correctAlpha3, wrongAlpha3, hoveredAlpha3],
  );

  const sideColor = useCallback(() => SIDE_COLOR, []);
  const strokeColor = useCallback(
    (feat: object) => {
      const alpha3 = (feat as CountryFeature).properties.alpha3;
      if (alpha3 === hoveredAlpha3 || alpha3 === correctAlpha3 || alpha3 === wrongAlpha3) return HOVER_BORDER_COLOR;
      return BORDER_COLOR;
    },
    [hoveredAlpha3, correctAlpha3, wrongAlpha3],
  );
  // Flat everywhere — no extrusion. This removes both the obscuring raised
  // "wall" on hover and the flicker caused by animating polygon geometry.
  const altitude = useCallback(() => POLYGON_ALTITUDE, []);

  // Configure three.js controls once the globe instance is ready.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.minDistance = 101 + MIN_ALTITUDE * 100;
    controls.maxDistance = 101 + MAX_ALTITUDE * 100;
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);
  }, []);

  // Stop auto-rotate as soon as the player starts interacting.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.controls().autoRotate = !interactive;
  }, [interactive]);

  useEffect(() => {
    if (!flyTo) return;
    const globe = globeRef.current;
    if (!globe) return;
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: flyTo.lat, lng: flyTo.lon, altitude: 1.1 }, 900);
  }, [flyTo]);

  const handleHover = useCallback(
    (feat: object | null) => {
      onHover(feat ? (feat as CountryFeature).properties.alpha3 : null);
      if (containerRef.current) containerRef.current.style.cursor = feat ? 'pointer' : 'grab';
    },
    [onHover],
  );

  const handleClick = useCallback(
    (feat: object) => {
      const alpha3 = (feat as CountryFeature).properties.alpha3;
      const country = byAlpha3.get(alpha3);
      if (country) onPick(country);
    },
    [byAlpha3, onPick],
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <GlobeGl
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial as never}
        showAtmosphere
        atmosphereColor="#7fb4ff"
        atmosphereAltitude={0.22}
        polygonsData={features}
        polygonGeoJsonGeometry={((d: object) => (d as CountryFeature).geometry) as never}
        polygonCapColor={capColor}
        polygonSideColor={sideColor}
        polygonStrokeColor={strokeColor}
        polygonAltitude={altitude}
        polygonsTransitionDuration={0}
        onPolygonHover={handleHover}
        onPolygonClick={handleClick}
      />
    </div>
  );
}
