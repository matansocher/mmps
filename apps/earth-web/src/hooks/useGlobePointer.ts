import { ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EarthEngine } from '../globe/engine';
import { pickLatLon } from '../globe/pick';
import type { Country } from '../types';

const HINT_MS = 2200;

// Turns globe clicks into country picks and tracks the hovered country while `active`.
export type ScreenPoint = { readonly x: number; readonly y: number };

export function useGlobePointer(engine: EarthEngine, active: boolean, onPick: (country: Country, at: ScreenPoint) => void) {
  const { viewer, countries } = engine;
  const [hover, setHover] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const activeRef = useRef(active);
  const onPickRef = useRef(onPick);
  useLayoutEffect(() => {
    activeRef.current = active;
    onPickRef.current = onPick;
  });

  useEffect(() => {
    if (active) return;
    setHover(null);
    viewer.scene.canvas.style.cursor = '';
  }, [active, viewer]);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(({ position }: ScreenSpaceEventHandler.PositionedEvent) => {
      if (!activeRef.current) return;
      const point = pickLatLon(viewer, position);
      const country = point ? countries.findAt(point) : null;
      if (!country) {
        setHint(point ? 'That’s water — try again.' : 'That’s space — try again.');
        return;
      }
      setHint(null);
      setHover(null);
      onPickRef.current(country, { x: position.x, y: position.y });
    }, ScreenSpaceEventType.LEFT_CLICK);

    let frame = 0;
    handler.setInputAction(({ endPosition }: ScreenSpaceEventHandler.MotionEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const point = activeRef.current ? pickLatLon(viewer, endPosition) : null;
        const code = point ? (countries.findAt(point)?.code ?? null) : null;
        viewer.scene.canvas.style.cursor = code ? 'pointer' : '';
        setHover(code);
      });
    }, ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      cancelAnimationFrame(frame);
      handler.destroy();
      viewer.scene.canvas.style.cursor = '';
    };
  }, [viewer, countries]);

  return { hover, hint, setHint };
}
