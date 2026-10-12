import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MECHANIC_FIXTURES } from '../../test';
import { CHECKPOINT_KEY, packRoom, readCheckpoint, restoreRoom, saveCheckpoint } from './checkpoint';
import { levelById, LEVELS } from './levels';
import { emptyProgress } from './progress';
import { createSession, reduceSession } from './session';
import { solve } from './solver';

const storage = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
};
const unlocked = (id: number) => ({
  ...emptyProgress(),
  completed: Object.fromEntries(
    LEVELS.slice(
      0,
      LEVELS.findIndex((level) => level.id === id),
    ).map((level) => [level.id, { stars: 1, bestMoves: null }]),
  ),
});

beforeEach(() => vi.stubEnv('DEV', false));
afterEach(() => vi.unstubAllEnvs());

describe('action-replay checkpoints', () => {
  test.each([...LEVELS, ...MECHANIC_FIXTURES])('restores $name and its complete undo history', (level) => {
    const store = storage();
    const { id } = level;
    const levels = LEVELS.map((room) => (room.id === id ? level : room));
    const proof = solve(level);
    if (proof.status !== 'solved') throw new Error('Expected a solution');
    const session = proof.actions.reduce(reduceSession, createSession(level));
    saveCheckpoint(store, session);
    const restored = readCheckpoint(store, levels, unlocked(id));
    expect(restored).toEqual(session);
    expect(restoreRoom(packRoom(session), levels, unlocked(id))).toEqual(session);
    expect(reduceSession(restored!, { type: 'undo' }).state).toEqual(session.history.at(-1));
    expect(JSON.parse(store.getItem(CHECKPOINT_KEY)!).player).toEqual(undefined);
  });
  test('does not restore changed layouts or rooms that are still locked', () => {
    const store = storage();
    saveCheckpoint(store, createSession(levelById(21)));
    expect(() => readCheckpoint(store, LEVELS, emptyProgress())).toThrow('invalid');
    expect(() => readCheckpoint(store, [{ ...levelById(21), map: ['#####', '#S.E#', '#####'] }], unlocked(21))).toThrow('changed');
  });
  test('resumes a later test room in development without bypassing production locks', () => {
    const store = storage();
    const progress = emptyProgress();
    const session = reduceSession(createSession(LEVELS.at(-1)!), { type: 'move', move: 'right' });
    saveCheckpoint(store, session);

    vi.stubEnv('DEV', true);
    expect(readCheckpoint(store, LEVELS, progress)).toEqual(session);
    expect(restoreRoom(packRoom(session), LEVELS, progress)).toEqual(session);
    expect(progress).toEqual(emptyProgress());

    vi.stubEnv('DEV', false);
    expect(() => readCheckpoint(store, LEVELS, progress)).toThrow('invalid');
    expect(() => restoreRoom(packRoom(session), LEVELS, progress)).toThrow('invalid');
  });
  test('a six-room edition checkpoint retains its exact position and undo history after expansion', () => {
    const signature = JSON.stringify(['solo-1', ['########', '#S.k...#', '#..#..##', '#..KCKk#', '####E###', '########']]);
    const actions = [
      { type: 'move', move: 'right' },
      { type: 'move', move: 'right' },
      { type: 'move', move: 'left' },
    ] as const;
    const store = storage();
    store.setItem('rewind.solo.run.v2', JSON.stringify({ id: 103, signature, actions }));
    const expected = actions.reduce(reduceSession, createSession(levelById(103)));
    expect(readCheckpoint(store, LEVELS, unlocked(103))).toEqual(expected);
    expect(restoreRoom({ id: 103, signature, moves: 'RRL' }, LEVELS, unlocked(103))).toEqual(expected);
    expect(reduceSession(expected, { type: 'undo' }).state).toEqual(expected.history.at(-1));
  });
  test.each(['null', '{}', '{"id":1,"actions":[{"type":"rewind"}]}', '{'])('rejects malformed checkpoints: %s', (raw) => {
    const store = storage();
    store.setItem(CHECKPOINT_KEY, raw);
    expect(() => readCheckpoint(store, LEVELS, emptyProgress())).toThrow();
  });
  test('rejects unreachable interactions and actions after a win', () => {
    const store = storage();
    saveCheckpoint(store, createSession(LEVELS[0]));
    const saved = JSON.parse(store.getItem(CHECKPOINT_KEY)!);
    store.setItem(CHECKPOINT_KEY, JSON.stringify({ ...saved, actions: [{ type: 'interact', position: -1 }] }));
    expect(() => readCheckpoint(store, LEVELS, emptyProgress())).toThrow('not reachable');
    const proof = solve(LEVELS[0]);
    if (proof.status !== 'solved') throw new Error('Expected a solution');
    store.setItem(CHECKPOINT_KEY, JSON.stringify({ ...saved, actions: [...proof.actions, { type: 'move', move: 'left' }] }));
    expect(() => readCheckpoint(store, LEVELS, emptyProgress())).toThrow('after completion');
  });
  test('absence is normal, but storage failures propagate', () => {
    expect(readCheckpoint(storage(), LEVELS, emptyProgress())).toEqual(null);
    expect(() =>
      readCheckpoint(
        {
          getItem: () => {
            throw new Error('denied');
          },
        },
        LEVELS,
        emptyProgress(),
      ),
    ).toThrow('denied');
    expect(() =>
      saveCheckpoint(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        createSession(LEVELS[0]),
      ),
    ).toThrow('full');
  });
});
