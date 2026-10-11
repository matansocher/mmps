import { listKeys, readJson, writeJson } from '../lib/storage';

const BEST_PREFIX = 'best:';

const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const readBestScore = (key: string): number => readJson(key, 0, isScore);

export const writeBestScore = (key: string, score: number): boolean => writeJson(key, score);

export function readAllBestScores(): Record<string, number> {
  return Object.fromEntries(listKeys(BEST_PREFIX).map((key) => [key, readBestScore(key)]));
}

export function writeBestScores(scores: Readonly<Record<string, number>>): void {
  for (const [key, score] of Object.entries(scores)) {
    if (key.startsWith(BEST_PREFIX) && isScore(score) && score > readBestScore(key)) writeBestScore(key, score);
  }
}
