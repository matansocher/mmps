import { describe, expect, test } from 'vitest';
import { availableInteractions, bridgeIsHorizontal, createState, lightPaths, openDoors, play, step } from './engine';
import type { Level } from './types';

const level = (map: readonly string[]): Level => ({ id: 1, chapter: 1, name: 'Test', goal: '', hint: '', par: 10, difficulty: 1, map });
const moves = (map: readonly string[], directions: readonly ('up' | 'right' | 'down' | 'left')[]) => directions.reduce(play, createState(level(map)));

describe('solo step', () => {
  test('does not mutate its input or create helpers', () => {
    const state = createState(level(['#######', '#SCaAE#', '#######']));
    const before = JSON.stringify(state);
    const next = play(state, 'right');
    expect(JSON.stringify(state)).toEqual(before);
    expect(next.crates).toEqual([state.player + 2]);
    expect([...openDoors(next)]).toEqual(['A']);
    expect('ghosts' in next).toEqual(false);
  });

  test('moves have no exhaustion limit and walls remain undoable attempts', () => {
    let state = createState(level(['#####', '#S.E#', '#####']));
    for (let turn = 0; turn < 1000; turn++) state = play(state, 'up');
    expect(state.moves).toEqual(1000);
    expect(play(play(state, 'right'), 'right').won).toEqual(true);
  });

  test('a barrel holds a switch and the gate closes when weight moves away', () => {
    const state = moves(['########', '#SCa.AE#', '########'], ['right']);
    expect([...openDoors(state)]).toEqual(['A']);
    const next = play(play(state, 'right'), 'left');
    expect([...openDoors(next)]).toEqual([]);
  });

  test('keys are collected once, consumed by matching locks, and locks remain open', () => {
    let state = moves(['########', '#SkK..E#', '########'], ['right', 'right']);
    expect(state.keys).toEqual([]);
    expect(state.unlockedLocks).toEqual([11]);
    state = play(play(play(state, 'left'), 'left'), 'right');
    expect(state.keys).toEqual([]);
    expect(play(state, 'right').player).toEqual(11);
  });

  test('a key does not open a different lock', () => {
    const state = moves(['########', '#SkJj.E#', '########'], ['right', 'right']);
    expect(state.player).toEqual(10);
    expect(state.events).toEqual(['blocked']);
  });

  test('ice ends on dry ground and costs one move', () => {
    const state = moves(['########', '#S~~~.E#', '########'], ['right']);
    expect(state.player).toEqual(13);
    expect(state.moves).toEqual(1);
  });

  test('ice stops before an obstacle and does not automatically push a barrel', () => {
    const state = moves(['########', '#S~~C.E#', '########'], ['right']);
    expect(state.player).toEqual(11);
    expect(state.crates).toEqual([12]);
  });

  test('a pushed barrel slides onto a switch', () => {
    const state = moves(['##########', '#SC~~a.AE#', '##########'], ['right']);
    expect(state.crates).toEqual([15]);
    expect([...openDoors(state)]).toEqual(['A']);
  });

  test('a key at the ice landing is collected', () => {
    const state = moves(['########', '#S~~kKE#', '########'], ['right']);
    expect(state.keys).toEqual(['k']);
    expect(play(state, 'right').unlockedLocks.length).toEqual(1);
  });

  test('crumbling floor collapses after being vacated, not before', () => {
    const onTile = moves(['#######', '#S,..E#', '#######'], ['right']);
    expect(onTile.collapsed).toEqual([]);
    const left = play(onTile, 'right');
    expect(left.collapsed).toEqual([9]);
    expect(play(left, 'left').player).toEqual(left.player);
  });

  test('barrels and the player can hand over a cracked tile without collapsing it underneath them', () => {
    const start = createState(level(['########', '#SC,..E#', '########']));
    const first = play(start, 'right');
    const second = play(first, 'right');
    expect(second.collapsed).toEqual([]);
    expect(play(second, 'left').collapsed).toEqual([11]);
  });

  test('a bridge only permits travel along its current orientation', () => {
    let state = moves(['#######', '#S.|.E#', '#######'], ['right']);
    expect(play(state, 'right').player).toEqual(state.player);
    state = step(state, { type: 'interact', position: 10 });
    expect(bridgeIsHorizontal(state, 10)).toEqual(true);
    state = play(state, 'right');
    expect(state.player).toEqual(10);
    expect(availableInteractions(state)).not.toContain(10);
  });

  test('one-way gates enforce direction on entry and exit', () => {
    const state = moves(['#######', '#S.>.E#', '#######'], ['right', 'right']);
    expect(play(state, 'left').player).toEqual(state.player);
    expect(play(state, 'right').player).toEqual(state.player + 1);
  });

  test('lever gates swap persistently and can be switched back', () => {
    const state = createState(level(['########', '#Sl.GHE#', '########']));
    const pulled = step(state, { type: 'interact', position: 10 });
    expect(pulled.leverOn).toEqual(true);
    expect(step(pulled, { type: 'interact', position: 10 }).leverOn).toEqual(false);
  });

  test('tunnels teleport once rather than bouncing between endpoints', () => {
    const state = moves(['#########', '#S0##0.E#', '#########'], ['right']);
    expect(state.player).toEqual(14);
    expect(play(state, 'right').player).toEqual(15);
  });

  test('a barrel can travel through a tunnel without overlapping the player', () => {
    const state = moves(['###########', '#SC0#0.aAE#', '#...#....##', '###########'], ['right']);
    expect(state.crates).toEqual([16]);
    expect(state.player).toEqual(13);
    expect(play(state, 'right').player).toEqual(14);
  });

  test('rotating a mirror redirects the beam and powers a receiver', () => {
    let state = createState(level(['#######', '###o###', '#*.\\..#', '#S...E#', '#######']));
    expect(lightPaths(state).powered).toEqual(false);
    state = play(play(state, 'right'), 'right');
    state = step(state, { type: 'interact', position: 17 });
    expect(lightPaths(state).powered).toEqual(true);
  });

  test('barrels block light but players do not', () => {
    const state = createState(level(['########', '#*..oLE#', '#S.C...#', '########']));
    expect(lightPaths({ ...state, player: 11 }).powered).toEqual(true);
    expect(lightPaths({ ...state, crates: [11] }).powered).toEqual(false);
  });

  test('every receiver must be lit before the light gate opens', () => {
    const first = createState(level(['##########', '#*..o...E#', '#S..o....#', '##########']));
    expect(lightPaths(first).lit.size).toEqual(1);
    expect(lightPaths(first).powered).toEqual(false);
    const both = createState(level(['##########', '#*..o...E#', '#S.*o....#', '##########']));
    expect(lightPaths(both).lit.size).toEqual(2);
    expect(lightPaths(both).powered).toEqual(true);
  });

  test('a barrel prevents rotating an occupied bridge', () => {
    const state = moves(['#######', '#S.|.E#', '#######'], ['right']);
    const occupied = { ...state, crates: [state.player + 1] };
    expect(availableInteractions(occupied)).not.toContain(state.player + 1);
    expect(() => step(occupied, { type: 'interact', position: state.player + 1 })).toThrow('not reachable');
  });

  test('light tracing terminates in a reflected loop', () => {
    const state = createState(level(['########', '#*/.\\..#', '#.\\./oE#', '#S.....#', '########']));
    expect(lightPaths(state).paths.flat().length).toBeLessThan(100);
  });

  test('unreachable interactions fail explicitly', () => {
    const state = createState(level(['#######', '#S..lE#', '#######']));
    expect(() => step(state, { type: 'interact', position: 11 })).toThrow('not reachable');
  });

  test('unpaired tunnels and unlinked locks are rejected', () => {
    expect(() => createState(level(['#####', '#S0E#', '#####']))).toThrow('pair');
    expect(() => createState(level(['#####', '#SKE#', '#####']))).toThrow('no key');
  });
});
