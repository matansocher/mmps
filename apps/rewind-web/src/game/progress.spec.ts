import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createState } from './engine';
import { CHAPTERS, levelById, LEVELS, twoStarTarget } from './levels';
import {
  acknowledgeUnlock,
  chapterComplete,
  earnProgress,
  emptyProgress,
  isAvailable,
  isCleared,
  LEGACY_PROGRESS_KEY,
  nextLevelId,
  pendingReward,
  PROGRESS_KEY,
  readProgress,
  saveProgress,
  skipBalance,
  skipLevel,
  totalStars,
} from './progress';
import type { Progress } from './progress';

const finish = (progress: Progress, id: number, moves = levelById(id).par) => earnProgress(progress, { ...createState(levelById(id)), won: true, moves });
const through = (count: number) => LEVELS.slice(0, count).reduce((progress, level) => finish(progress, level.id), emptyProgress());
const acknowledge = (progress: Progress) => acknowledgeUnlock(progress, pendingReward(progress)!);
const storage = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
};

beforeEach(() => vi.stubEnv('DEV', false));
afterEach(() => vi.unstubAllEnvs());

describe('development room access', () => {
  test('opens every published room without completing rooms or awarding stars and skips', () => {
    vi.stubEnv('DEV', true);
    const progress = emptyProgress();
    expect(LEVELS.every((level) => isAvailable(progress, level.id))).toEqual(true);
    expect(progress).toEqual(emptyProgress());
    expect(totalStars(progress)).toEqual(0);
    expect(skipBalance(progress)).toEqual(0);
    expect(pendingReward(progress)).toEqual(undefined);
    expect(nextLevelId(progress)).toEqual(LEVELS[0].id);
  });
  test('keeps sequential unlocking in production', () => {
    const progress = emptyProgress();
    expect(LEVELS.filter((level) => isAvailable(progress, level.id)).map((level) => level.id)).toEqual([LEVELS[0].id]);
  });
  test.each([false, true])('rejects unpublished room IDs with development mode %s', (development) => {
    vi.stubEnv('DEV', development);
    for (const id of [0, -1, 2, 232, 233, 999, NaN, Infinity]) {
      expect(isAvailable(emptyProgress(), id)).toEqual(false);
    }
  });
});

describe('stars and curated progression', () => {
  test('starts at the first puzzle with no skips; IDs are not display numbers', () => {
    const progress = emptyProgress();
    expect(nextLevelId(progress)).toEqual(1);
    expect(isAvailable(progress, 1)).toEqual(true);
    expect(isAvailable(progress, 11)).toEqual(false);
    expect(isAvailable(progress, 2)).toEqual(false);
    expect(skipBalance(progress)).toEqual(0);
    expect(pendingReward(progress)).toEqual(undefined);
    expect(() => skipLevel(progress, 1)).toThrow();
    expect(earnProgress(progress, createState(LEVELS[0]))).toBe(progress);
    expect(nextLevelId(through(1))).toEqual(11);
    expect(nextLevelId(through(2))).toEqual(101);
    expect(nextLevelId(through(4))).toEqual(21);
  });
  test('introduces two skips with the first completed chapter, not a fixed room number', () => {
    expect(skipBalance(through(3))).toEqual(0);
    const progress = through(4);
    expect(skipBalance(progress)).toEqual(2);
    expect(pendingReward(progress)).toEqual({ id: 'reward-1', kind: 'chapter', chapter: 1 });
    expect(() => skipLevel(progress, 21)).toThrow();
    const seen = acknowledge(progress);
    expect(seen.seen).toContain('skips');
    expect(seen.seen).toContain('concept-3');
    expect(pendingReward(seen)).toEqual(undefined);
    expect(skipBalance(finish(seen, 102))).toEqual(2);
  });
  test('skips earn no stars, remain replayable, and are not refunded when solved later', () => {
    const original = acknowledge(through(4));
    const skipped = skipLevel(original, 21);
    expect(skipBalance(skipped)).toEqual(1);
    expect(skipped.completed[21]).toEqual(undefined);
    expect(totalStars(skipped)).toEqual(totalStars(original));
    expect(isCleared(skipped, 21)).toEqual(true);
    expect(isAvailable(skipped, 21)).toEqual(true);
    expect(nextLevelId(skipped)).toEqual(103);
    const solvedLater = finish(skipped, 21);
    expect(solvedLater.completed[21].stars).toEqual(3);
    expect(solvedLater.skipped).toEqual([21]);
    expect(skipBalance(solvedLater)).toEqual(1);
    expect(() => skipLevel(skipped, 21)).toThrow();
    expect(() => skipLevel({ ...emptyProgress(), seen: ['skips'] }, 1)).toThrow();
  });
  test('clearing the shorter chapter with skips rewards it once and opens the winter garden', () => {
    let progress = skipLevel(skipLevel(acknowledge(through(4)), 21), 103);
    expect(chapterComplete(progress, 3)).toEqual(true);
    expect(chapterComplete(progress, 2)).toEqual(false);
    expect(skipBalance(progress)).toEqual(2);
    expect(nextLevelId(progress)).toEqual(201);
    expect(pendingReward(progress)).toEqual({ id: 'reward-3', kind: 'chapter', chapter: 3 });
    progress = acknowledge(progress);
    expect(progress.seen).toContain('concept-4');
    expect(pendingReward(progress)).toEqual(undefined);
    expect(skipBalance(finish(progress, 103))).toEqual(2);
  });
  test('rewards do not repeat on replay or reload, and unbuilt regions never award skips', () => {
    const progress = CHAPTERS.reduce((value) => acknowledge(value), through(LEVELS.length));
    expect(skipBalance(progress)).toEqual(18);
    const store = storage();
    saveProgress(store, progress);
    expect(readProgress(store)).toEqual(progress);
    expect(pendingReward(readProgress(store))).toEqual(undefined);
    expect(skipBalance(finish(progress, 101))).toEqual(18);
    expect(totalStars(progress)).toEqual(114);
    expect(nextLevelId(progress)).toEqual(LEVELS.at(-1)!.id);
  });
  test('returns to skipped rooms only after the entire expanded path is cleared', () => {
    const completed = { ...through(LEVELS.length).completed };
    delete completed[21];
    delete completed[219];
    const progress: Progress = { completed, skipped: [21, 219], seen: ['skips'] };
    expect(nextLevelId(progress)).toEqual(21);
    expect(nextLevelId(finish(progress, 21))).toEqual(219);
    expect(skipBalance(progress)).toEqual(16);
    expect(skipBalance(finish(finish(progress, 21), 219))).toEqual(16);
  });
  test('keeps the strongest stars and best move count independently', () => {
    const level = LEVELS[0];
    const slow = finish(emptyProgress(), 1, twoStarTarget(level) + 1);
    const tidy = finish(slow, 1, twoStarTarget(level));
    const perfect = finish(tidy, 1, level.par);
    expect(slow.completed[1].stars).toEqual(1);
    expect(tidy.completed[1].stars).toEqual(2);
    expect(perfect.completed[1]).toEqual({ stars: 3, bestMoves: level.par });
    expect(finish(perfect, 1, 100).completed[1]).toEqual(perfect.completed[1]);
  });
});

describe('progress migration and storage', () => {
  test('the six-room v2 save keeps all stars, discoveries, and four skips without replaying rewards', () => {
    const previous: Progress = {
      ...through(6),
      seen: ['concept-1', 'concept-2', 'concept-3', 'reward-1', 'reward-3', 'skips'],
    };
    const store = storage();
    store.setItem('rewind.solo.progress.v2', JSON.stringify(previous));
    const restored = readProgress(store);
    expect(restored).toEqual(previous);
    expect(totalStars(restored)).toEqual(18);
    expect(skipBalance(restored)).toEqual(4);
    expect(pendingReward(restored)).toEqual(undefined);
    expect(nextLevelId(restored)).toEqual(201);
    expect(isAvailable(restored, 201)).toEqual(true);
    expect(isAvailable(restored, 202)).toEqual(false);
    saveProgress(store, restored);
    expect(readProgress(store)).toEqual(previous);
  });
  test('archives the hundred-room journey and carries results only for unchanged puzzles', () => {
    const store = storage();
    const old = JSON.stringify({
      completed: Object.fromEntries([1, 2, 5, 11, 21, 27].map((id) => [id, { stars: 3, bestMoves: 10 }])),
      skipped: [6],
      seen: ['concept-1', 'concept-2', 'concept-3', 'skips', 'reward-1'],
    });
    store.setItem(LEGACY_PROGRESS_KEY, old);
    store.setItem('rewind.solo.run.v1', '{"id":27,"moves":"R"}');
    const migrated = readProgress(store);
    expect(Object.keys(migrated.completed)).toEqual(['1', '11', '21']);
    expect(migrated.seen).toEqual(['concept-1', 'concept-2', 'concept-3']);
    expect(migrated.skipped).toEqual([]);
    expect(migrated.completed[101]).toEqual(undefined);
    expect(nextLevelId(migrated)).toEqual(101);
    saveProgress(store, migrated);
    expect(store.getItem(LEGACY_PROGRESS_KEY)).toEqual(old);
    expect(store.getItem('rewind.solo.run.v1')).toEqual('{"id":27,"moves":"R"}');
    expect(readProgress(store)).toEqual(migrated);
    saveProgress(store, emptyProgress());
    expect(readProgress(store)).toEqual(emptyProgress());
  });
  test('migrates only still-matching rooms from the earliest campaign without touching its save', () => {
    const store = storage();
    const old = JSON.stringify({ 2: { par: true }, 3: { par: true }, 4: { par: true }, 7: { par: true } });
    store.setItem('rewind.progress.v2', old);
    const migrated = readProgress(store);
    expect(Object.keys(migrated.completed)).toEqual(['1', '11']);
    expect(migrated.completed[1]).toEqual({ stars: 3, bestMoves: null });
    expect(migrated.completed[11]).toEqual({ stars: 3, bestMoves: null });
    saveProgress(store, migrated);
    expect(store.getItem('rewind.progress.v2')).toEqual(old);
  });
  test.each([
    null,
    {},
    { completed: {}, skipped: [1], seen: [] },
    { completed: { 2: { stars: 1, bestMoves: 2 } }, skipped: [], seen: [] },
    { completed: { 1: { stars: 4, bestMoves: 2 } }, skipped: [], seen: [] },
    { completed: { 1: { stars: 1, bestMoves: -2 } }, skipped: [], seen: [] },
    { completed: {}, skipped: [], seen: ['reward-2'] },
  ])('rejects invalid new progress without falling back to an old save: %j', (value) => {
    const store = storage();
    store.setItem(PROGRESS_KEY, JSON.stringify(value));
    expect(() => readProgress(store)).toThrow();
  });
  test('propagates failed reads and writes', () => {
    expect(() =>
      readProgress({
        getItem: () => {
          throw new Error('denied');
        },
      }),
    ).toThrow('denied');
    expect(() =>
      saveProgress(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        emptyProgress(),
      ),
    ).toThrow('full');
  });
});
