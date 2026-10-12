import { emptyProgress, isRoomId, migrateLegacyProgress, parseProgress, skipsEarned } from '../../../../src/shared/rewind';
import type { Completion, Progress } from '../../../../src/shared/rewind';
import { CHAPTERS, levelById, LEVELS, twoStarTarget } from './levels';
import type { GameState } from './types';

export type { Completion, Progress } from '../../../../src/shared/rewind';
export { emptyProgress } from '../../../../src/shared/rewind';
export type Unlock = { readonly id: string; readonly kind: 'chapter' | 'concept'; readonly chapter: number };
export const PROGRESS_KEY = 'rewind.solo.progress.v2';
export const LEGACY_PROGRESS_KEY = 'rewind.solo.progress.v1';

export function isCleared(progress: Progress, id: number): boolean {
  return !!progress.completed[id] || progress.skipped.includes(id);
}
export function nextLevelId(progress: Progress): number {
  return LEVELS.find((level) => !isCleared(progress, level.id))?.id ?? LEVELS.find((level) => !progress.completed[level.id])?.id ?? LEVELS.at(-1)!.id;
}
export function isAvailable(progress: Progress, id: number): boolean {
  return isRoomId(id) && (import.meta.env?.DEV || isCleared(progress, id) || id === nextLevelId(progress));
}
export function chapterComplete(progress: Progress, chapter: number): boolean {
  const rooms = LEVELS.filter((level) => level.chapter === chapter);
  return rooms.length > 0 && rooms.every((level) => isCleared(progress, level.id));
}
export function skipBalance(progress: Progress): number {
  return skipsEarned(progress) - progress.skipped.length;
}
export function pendingReward(progress: Progress): Unlock | undefined {
  const chapter = CHAPTERS.find((chapter) => chapterComplete(progress, chapter.id) && !progress.seen.includes(`reward-${chapter.id}`));
  return chapter ? { id: `reward-${chapter.id}`, kind: 'chapter', chapter: chapter.id } : undefined;
}
export function acknowledgeUnlock(progress: Progress, unlock: Unlock): Progress {
  const seen = new Set([...progress.seen, unlock.id]);
  if (unlock.kind === 'chapter') {
    seen.add('skips');
    const nextChapter = CHAPTERS[CHAPTERS.findIndex((chapter) => chapter.id === unlock.chapter) + 1];
    const introduction = LEVELS.find((level) => level.chapter === nextChapter?.id)?.introduction;
    if (introduction) seen.add(`concept-${introduction}`);
  }
  return { ...progress, seen: [...seen] };
}
export function skipLevel(progress: Progress, id: number): Progress {
  if (!isAvailable(progress, id) || isCleared(progress, id) || !progress.seen.includes('skips') || skipBalance(progress) < 1) throw new Error('This room cannot be skipped');
  return { ...progress, skipped: [...progress.skipped, id] };
}
export function earnProgress(progress: Progress, state: GameState): Progress {
  if (!state.won) return progress;
  const old = progress.completed[state.level.id];
  const stars = 1 + Number(state.moves <= twoStarTarget(state.level)) + Number(state.moves <= state.level.par);
  return { ...progress, completed: { ...progress.completed, [state.level.id]: { stars: Math.max(old?.stars ?? 0, stars), bestMoves: Math.min(old?.bestMoves ?? Infinity, state.moves) } } };
}
export function totalStars(progress: Progress): number {
  return Object.values(progress.completed).reduce((sum, result) => sum + result.stars, 0);
}
export function readProgress(storage: Pick<Storage, 'getItem'>): Progress {
  const raw = storage.getItem(PROGRESS_KEY);
  if (!raw) {
    const legacy = storage.getItem(LEGACY_PROGRESS_KEY);
    if (legacy) return migrateLegacyProgress(JSON.parse(legacy));
    const oldRaw = storage.getItem('rewind.progress.v2');
    if (!oldRaw) return emptyProgress();
    const old: unknown = JSON.parse(oldRaw);
    if (!old || typeof old !== 'object' || Array.isArray(old)) throw new Error('Invalid previous campaign progress');
    const completed: Record<number, Completion> = {};
    for (const [previous, current, oldPar] of [
      [2, 1, 5],
      [3, 11, 6],
    ]) {
      const result: unknown = Reflect.get(old, String(previous));
      if (result && typeof result === 'object' && 'par' in result && typeof result.par === 'boolean') {
        const room = levelById(current);
        completed[current] = { stars: result.par ? 1 + Number(oldPar <= twoStarTarget(room)) + Number(oldPar <= room.par) : 1, bestMoves: null };
      }
    }
    return { ...emptyProgress(), completed };
  }
  return parseProgress(JSON.parse(raw));
}
export function saveProgress(storage: Pick<Storage, 'setItem'>, progress: Progress): void {
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
