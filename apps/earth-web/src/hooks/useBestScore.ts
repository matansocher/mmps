import { useCallback, useState } from 'react';
import { readJson, writeJson } from '../lib/storage';

const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const readBestScore = (key: string): number => readJson(key, 0, isScore);

export function useBestScore(key: string): { readonly best: number; readonly record: (result: number) => boolean } {
  const [best, setBest] = useState(() => readBestScore(key));
  const record = useCallback(
    (result: number) => {
      if (result <= readBestScore(key)) return false;
      writeJson(key, result);
      setBest(result);
      return true;
    },
    [key],
  );
  return { best, record };
}
