import { describe, expect, test } from 'vitest';
import { CAMPAIGN, RETAINED_ROOM_IDS } from '../../../../src/shared/rewind';
import { ROOM_DESIGNS } from '../../test';
import { createState, play, step } from './engine';
import { conceptsInLevel } from './guidance';
import { CHAPTERS, introductionById, levelById, LEVELS } from './levels';
import { replaySolution, solve, solveFromState, stateKey } from './solver';
import type { Concept, GameEvent, GameState } from './types';

const solutions = new Map(LEVELS.map((level) => [level.id, solve(level, 150_000)]));
const contracts: readonly { readonly id: number; readonly insight: string; readonly withoutInsight: (state: GameState) => boolean }[] = [
  { id: 101, insight: 'borrow the same weight before moving it to the exit circuit', withoutInsight: (state) => !state.crates.some((position) => state.board.tiles[position] === 'a') },
  { id: 102, insight: 'temporarily park a barrel in the working bay before handing over the switch', withoutInsight: (state) => !state.crates.includes(state.board.width * 4 + 3) },
  { id: 103, insight: 'open both flanking locks before moving the barrel', withoutInsight: (state) => state.unlockedLocks.length < 2 },
  ...ROOM_DESIGNS.map(({ id, insight, required }) => ({ id, insight, withoutInsight: (state: GameState) => !required(state) })),
];
const introductionEvents: Partial<Record<Concept, GameEvent>> = {
  barrel: 'push',
  switch: 'push',
  key: 'lock',
  ice: 'slide',
  crumble: 'crumble',
  bridge: 'bridge',
  lever: 'lever',
  tunnel: 'tunnel',
  light: 'mirror',
};

function routeStates(id: number): readonly GameState[] {
  const solution = solutions.get(id)!;
  if (solution.status !== 'solved') throw new Error(`Room ${id} has no verified route`);
  const states = [createState(levelById(id))];
  for (const action of solution.actions) states.push(step(states.at(-1)!, action));
  return states;
}

describe('release campaign', () => {
  test('uses stable puzzle IDs, variable chapter sizes, and an explicit design contract for every challenge', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(CAMPAIGN.map((room) => room.id));
    expect(new Set(LEVELS.map((level) => level.id)).size).toEqual(LEVELS.length);
    expect(new Set(LEVELS.map((level) => level.map.join('\n'))).size).toEqual(LEVELS.length);
    expect(LEVELS.length).toEqual(38);
    expect(CHAPTERS.map((chapter) => LEVELS.filter((room) => room.chapter === chapter.id).length)).toEqual([4, 2, 4, 4, 5, 4, 5, 5, 5]);
    expect(LEVELS.filter((level) => !level.introduction).map((level) => level.id)).toEqual(contracts.map((contract) => contract.id));
  });
  test.each(LEVELS)('$name has a shortest verified route at its three-star target', (level) => {
    const result = solutions.get(level.id)!;
    expect(result.status).toEqual('solved');
    if (result.status !== 'solved') throw new Error(`${level.id}: ${result.status}`);
    expect(result.actions.length).toEqual(level.par);
    expect(replaySolution(level, result.actions).won).toEqual(true);
  });
  test('introduces concepts explicitly, without a chapter-size formula or easy filler', () => {
    const known = new Set<Concept>();
    for (const level of LEVELS) {
      if (level.introduction) {
        const concept = introductionById(level.introduction).concept;
        expect(known.has(concept)).toEqual(false);
        known.add(concept);
        expect(level.par).toBeLessThanOrEqual(7);
        const states = routeStates(level.id);
        if (concept === 'one-way') expect(states.some((state) => ['^', '>', 'v', '<'].includes(state.board.tiles[state.player]))).toEqual(true);
        else expect(states.some((state) => state.events.includes(introductionEvents[concept]!))).toEqual(true);
      } else {
        expect(level.difficulty).toBeGreaterThan(1);
      }
      expect(conceptsInLevel(level).every((concept) => known.has(concept))).toEqual(true);
    }
    expect(known.size).toEqual(10);
  });
  test.each(contracts)('$id cannot bypass its central idea: $insight', ({ id, withoutInsight }) => {
    expect(solve(levelById(id), 150_000, withoutInsight).status).toEqual('unsolvable');
  });
  test('the borrowed weight changes jobs, leaving the first gate closed behind the player', () => {
    const states = routeStates(101);
    expect(states.some((state) => state.board.tiles[state.crates[0]] === 'a')).toEqual(true);
    const finish = states.at(-1)!;
    expect(finish.board.tiles[finish.crates[0]]).toEqual('b');
    expect(finish.crates.length).toEqual(1);
  });
  test('the handoff changes which barrel holds A and retrieves the temporarily parked barrel', () => {
    const states = routeStates(102);
    expect(states.some((state) => state.board.tiles[state.crates[1]] === 'a')).toEqual(true);
    expect(states.some((state) => state.crates[0] === state.board.width * 4 + 3)).toEqual(true);
    const finish = states.at(-1)!;
    expect(finish.crates.map((position) => finish.board.tiles[position])).toEqual(['a', 'b']);
  });
  test('spending the first key on the tempting left door deadlocks; undoing that choice keeps a solution', () => {
    const level = levelById(103);
    const before = (['right', 'right', 'left', 'down', 'down'] as const).reduce(play, createState(level));
    const wrong = play(before, 'right');
    expect(wrong.unlockedLocks).toEqual([27]);
    expect(solveFromState(wrong).status).toEqual('unsolvable');
    expect(solveFromState(before).status).toEqual('solved');
    expect(routeStates(103).at(-1)!.unlockedLocks).toEqual([29, 27]);
  });
  test('every migrated puzzle retains its exact old map and target', () => {
    expect(RETAINED_ROOM_IDS.map((id) => ({ map: levelById(id).map, par: levelById(id).par }))).toEqual([
      { map: ['#######', '###.###', '#..C.E#', '#S..###', '#######'], par: 5 },
      { map: ['########', '###a####', '#..C.AE#', '#S..####', '########'], par: 6 },
      { map: ['#######', '#S.kKE#', '#######'], par: 4 },
    ]);
  });
  test('keeps the six approved rooms unchanged when adding the rest of the valley', () => {
    expect(LEVELS.slice(0, 6).map(({ id, chapter, map, par }) => ({ id, chapter, map, par }))).toEqual([
      { id: 1, chapter: 1, map: ['#######', '###.###', '#..C.E#', '#S..###', '#######'], par: 5 },
      { id: 11, chapter: 1, map: ['########', '###a####', '#..C.AE#', '#S..####', '########'], par: 6 },
      { id: 101, chapter: 1, map: ['#########', '#E#######', '#B..bA..#', '#S.Ca##.#', '####....#', '#########'], par: 18 },
      { id: 102, chapter: 1, map: ['###########', '#...#######', '#AC.#######', '###.a.bABE#', '##..C...###', '##..S######', '###########'], par: 31 },
      { id: 21, chapter: 3, map: ['#######', '#S.kKE#', '#######'], par: 4 },
      { id: 103, chapter: 3, map: ['########', '#S.k...#', '#..#..##', '#..KCKk#', '####E###', '########'], par: 18 },
    ]);
  });
  test.each(['a', 'b'])('the finale cannot skip a temporary barrel job on switch %s', (mark) => {
    expect(solve(levelById(234), 150_000, (state) => !state.crates.some((position) => state.board.tiles[position] === mark)).status).toEqual('unsolvable');
  });
  test('the finale changes from temporary pressure to persistent control before clearing the beam', () => {
    const states = routeStates(234);
    const holds = (mark: string) => states.findIndex((state) => state.crates.some((position) => state.board.tiles[position] === mark));
    const powered = states.findIndex((state) => state.leverOn);
    const cleared = states.findIndex((state) => state.crates.includes(state.board.width * 3 + 5));
    expect(holds('a')).toBeGreaterThan(0);
    expect(holds('b')).toBeGreaterThan(holds('a'));
    expect(powered).toBeGreaterThan(holds('b'));
    expect(cleared).toBeGreaterThan(powered);
    expect(states.at(-1)!.flippedMirrors.length).toEqual(1);
    expect(solve(levelById(234), 150_000, (state) => !state.leverOn).status).toEqual('unsolvable');
  });
});

describe('finite-state BFS', () => {
  test('distinguishes an impossible room from an exhausted search budget', () => {
    expect(solve({ ...LEVELS[0], map: ['#####', '#S#E#', '#####'] }).status).toEqual('unsolvable');
    expect(solve(LEVELS[0], 1).status).toEqual('exhausted');
  });
  test('dedupes move counts, but preserves each piece of puzzle state', () => {
    const state = createState(LEVELS[0]);
    expect(stateKey({ ...state, moves: 100, message: 'Blocked', events: ['blocked'] })).toEqual(stateKey(state));
    for (const change of [
      { keys: ['k'] },
      { collectedKeys: [1] },
      { unlockedLocks: [1] },
      { collapsed: [1] },
      { flippedBridges: [1] },
      { flippedMirrors: [1] },
      { leverOn: true },
      { player: 1 },
      { crates: [1] },
    ])
      expect(stateKey({ ...state, ...change })).not.toEqual(stateKey(state));
  });
});
