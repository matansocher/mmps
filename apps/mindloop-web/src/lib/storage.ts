const KEY = 'mindloop:best-scores';

type BestScores = Record<string, number>;

function readAll(): BestScores {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(scores: BestScores) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function getBestScore(gameId: string): number {
  return readAll()[gameId] ?? 0;
}

/** Stores the score if it beats the stored best. Returns the (possibly new) best. */
export function commitScore(gameId: string, score: number): number {
  const all = readAll();
  const prev = all[gameId] ?? 0;
  if (score > prev) {
    all[gameId] = score;
    writeAll(all);
    return score;
  }
  return prev;
}

export function clearBestScores(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('mindloop:data'));
}
