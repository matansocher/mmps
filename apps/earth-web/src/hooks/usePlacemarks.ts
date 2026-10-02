import { useCallback } from 'react';
import { isArray, isRecord, newId } from '../lib/storage';
import type { Placemark } from '../types';
import { usePersistentState } from './usePersistentState';

const isPlacemark = (v: unknown): v is Placemark =>
  isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.lat === 'number' && typeof v.lon === 'number' && typeof v.color === 'string';

const isPlacemarkList = (v: unknown): v is Placemark[] => isArray(v) && v.every(isPlacemark);

export const PLACEMARK_COLORS = ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#a142f4', '#ff6d01', '#ffffff'];

export type PlacemarkDraft = Pick<Placemark, 'name' | 'lat' | 'lon'> & Partial<Pick<Placemark, 'description' | 'height' | 'color'>>;

export function usePlacemarks() {
  const [placemarks, setPlacemarks] = usePersistentState<Placemark[]>('placemarks', [], isPlacemarkList);

  const add = useCallback(
    (draft: PlacemarkDraft): Placemark => {
      const placemark: Placemark = {
        id: newId(),
        name: draft.name.trim() || 'Untitled placemark',
        description: draft.description ?? '',
        lat: draft.lat,
        lon: draft.lon,
        height: draft.height ?? 0,
        color: draft.color ?? PLACEMARK_COLORS[0],
        createdAt: new Date().toISOString(),
      };
      setPlacemarks((prev) => [placemark, ...prev]);
      return placemark;
    },
    [setPlacemarks],
  );

  const update = useCallback((id: string, patch: Partial<Omit<Placemark, 'id' | 'createdAt'>>) => setPlacemarks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))), [setPlacemarks]);
  const remove = useCallback((id: string) => setPlacemarks((prev) => prev.filter((p) => p.id !== id)), [setPlacemarks]);
  const replaceAll = useCallback((list: Placemark[]) => setPlacemarks(list), [setPlacemarks]);

  return { placemarks, add, update, remove, replaceAll };
}
