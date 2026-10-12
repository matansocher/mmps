import { describe, expect, test } from 'vitest';
import { MECHANIC_FIXTURES } from '../../test';
import { createState, play, step } from './engine';
import { getGuidance, inspectObject } from './guidance';
import { introductionById, LEVELS } from './levels';

describe('discoverable objects', () => {
  test.each([...LEVELS, ...MECHANIC_FIXTURES].filter((level) => !!level.introduction))('introduces $name with an on-board target and a short rule', (level) => {
    const chapter = introductionById(level.introduction!);
    const guidance = getGuidance(createState(level));
    expect(guidance.detail).toEqual(chapter.explanation);
    expect(guidance.target).toBeGreaterThan(0);
    expect(guidance.label).toBeTruthy();
  });
  test('changes the first lesson from parking the barrel to reaching the exit', () => {
    const start = createState(LEVELS[0]);
    const moved = (['right', 'right', 'up'] as const).reduce(play, start);
    expect(getGuidance(start).label).toEqual('PUSHABLE BARREL');
    expect(getGuidance(moved).label).toEqual('EXIT');
    expect(getGuidance(moved).title).toEqual('The passage is clear.');
  });
  test('object inspection does not change the state', () => {
    const state = createState(MECHANIC_FIXTURES.at(-1)!);
    const before = JSON.stringify(state);
    for (let position = 0; position < state.board.tiles.length; position++) inspectObject(state, position);
    expect(JSON.stringify(state)).toEqual(before);
  });
  test('blocked feedback replaces the instruction instead of adding another explanation', () => {
    const blocked = play(createState(LEVELS[0]), 'left');
    expect(getGuidance(blocked)).toEqual({ title: blocked.message, detail: '' });
  });
  test('describes fallen paving, flipped bridges, and lit receivers accurately', () => {
    const cracked = play(play(play(createState(MECHANIC_FIXTURES[1]), 'right'), 'right'), 'right');
    expect(inspectObject(cracked, cracked.collapsed[0])?.label).toEqual('FALLEN FLOOR');
    const bridge = play(createState(MECHANIC_FIXTURES[2]), 'right');
    const turned = step(bridge, { type: 'interact', position: bridge.player + 1 });
    expect(inspectObject(turned, bridge.player + 1)?.label).toEqual('CROSS SIDEWAYS');
  });
  test('a parked barrel can be inspected at its new location, not its old one', () => {
    let state = createState(LEVELS[0]);
    const oldPosition = state.crates[0];
    for (const move of ['right', 'right', 'up'] as const) state = play(state, move);
    expect(inspectObject(state, state.crates[0])?.label).toEqual('PUSHABLE BARREL');
    expect(inspectObject(state, oldPosition)).toEqual(null);
  });
});
