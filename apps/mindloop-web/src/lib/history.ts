import { getProgress, localDay, mergeRunHistory, progressCounts, readJson, recordProgress, removeJson, streakForDays, withProgressLock, writeJson } from './progress';
import type { RunRecord } from './progress';

export type PlayEntry = RunRecord;
export function getHistory(): PlayEntry[] {
  return readJson<PlayEntry[]>('mindloop:history', []);
}
export async function recordPlay(entry: PlayEntry): Promise<void> {
  await withProgressLock(() => {
    if (entry.gameId === 'warm-up' && readJson('mindloop:warmup-earned', false)) return;
    if (getHistory().some((run) => run.runId === entry.runId)) return;
    // Migrate before inserting: otherwise the new run would be counted twice.
    recordProgress(entry);
    writeJson('mindloop:history', mergeRunHistory([entry], getHistory()));
    if (entry.gameId === 'warm-up') writeJson('mindloop:warmup-earned', true);
    window.dispatchEvent(new Event('mindloop:data'));
  });
}
export function getPlayCount(gameId: string): number {
  return progressCounts(getProgress()).games[gameId] ?? 0;
}
export function getTotalPlays(): number {
  return Object.values(progressCounts(getProgress()).games).reduce((a, b) => a + b, 0);
}
export function getRecentGameIds(limit = 6): string[] {
  return [...new Set(getHistory().map((run) => run.gameId))].slice(0, limit);
}
export function getLastPlayed(gameId: string): string | null {
  return getHistory().find((run) => run.gameId === gameId)?.at ?? null;
}
export function getGamesPlayedCount(): number {
  return Object.keys(progressCounts(getProgress()).games).filter((id) => id !== 'warm-up').length;
}
export function getPlayedDays(): Set<string> {
  return new Set(Object.keys(progressCounts(getProgress()).days));
}
export const todayKey = localDay;
export function getTodayPlayCount(): number {
  return progressCounts(getProgress()).days[localDay()] ?? 0;
}
export const getTodayGamesPlayed = getTodayPlayCount;
export function playedToday(): boolean {
  return getTodayPlayCount() > 0;
}
export function getStreak(): number {
  return streakForDays([...getPlayedDays()]).current;
}
export function getLongestStreak(): number {
  return streakForDays([...getPlayedDays()]).longest;
}
export function getWeeklyDays(): number {
  const now = new Date();
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return [...getPlayedDays()].filter((day) => day >= localDay(now) && day <= localDay()).length;
}
export function clearHistory(): void {
  removeJson('mindloop:history');
  removeJson('mindloop:progress');
  removeJson('mindloop:device');
  window.dispatchEvent(new Event('mindloop:data'));
}
