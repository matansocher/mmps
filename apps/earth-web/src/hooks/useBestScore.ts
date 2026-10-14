import { useCallback, useState } from 'react';
import { readBestScore, writeBestScore } from '../store/best-scores';
import { syncProgress } from '../store/progress';

export { readBestScore };

export function useBestScore(key: string): { readonly best: number; readonly record: (result: number) => boolean } {
  const [best, setBest] = useState(() => readBestScore(key));
  const record = useCallback(
    (result: number) => {
      if (result <= readBestScore(key)) return false;
      writeBestScore(key, result);
      setBest(result);
      syncProgress();
      return true;
    },
    [key],
  );
  return { best, record };
}
