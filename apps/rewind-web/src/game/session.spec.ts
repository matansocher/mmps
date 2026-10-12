import { describe, expect, test } from 'vitest';
import { MECHANIC_FIXTURES } from '../../test';
import { LEVELS } from './levels';
import { createSession, reduceSession } from './session';
import { solve } from './solver';

describe('solo session', () => {
  test.each([...LEVELS, ...MECHANIC_FIXTURES])('undo restores every state in $name, including after winning', (level) => {
    const result = solve(level);
    if (result.status !== 'solved') throw new Error('Expected a solution');
    const initial = createSession(level);
    let session = initial;
    const snapshots = [initial.state];
    for (const action of result.actions) {
      session = reduceSession(session, action);
      snapshots.push(session.state);
    }
    expect(session.state.won).toEqual(true);
    expect(session.actions.length).toEqual(level.par);
    for (let i = result.actions.length - 1; i >= 0; i--) {
      session = reduceSession(session, { type: 'undo' });
      expect(session.state).toEqual(snapshots[i]);
    }
    expect(session).toEqual(initial);
    expect(reduceSession(session, { type: 'undo' })).toBe(session);
  });
  test('supports long attempts without putting entire tapes in each snapshot', () => {
    let session = createSession(LEVELS[0]);
    for (let i = 0; i < 2000; i++) session = reduceSession(session, { type: 'move', move: 'left' });
    expect(session.state.moves).toEqual(2000);
    expect(session.history.length).toEqual(2000);
    expect(session.history.every((state) => !('actions' in state) && !('history' in state) && !('tape' in state))).toEqual(true);
    expect(reduceSession(session, { type: 'restart' })).toEqual(createSession(LEVELS[0]));
  });
});
