import { assert, describe, expect, it } from 'vitest';
import { advanceRun, createRun, initialSwitches, type RunState, type Switches, TOTAL_TIME } from './engine';
import { LEVELS } from './levels';
import type { Level } from './model';

const fixture: Level = {
  id: 'test',
  name: 'Test',
  family: 'Corridor',
  difficulty: 'Easy',
  width: 600,
  height: 440,
  depot: 'depot',
  speed: 100,
  spawnEvery: 10,
  nodes: [
    { id: 'depot', x: 300, y: 400, kind: 'depot', outputs: ['approach'] },
    { id: 'switch', x: 300, y: 300, kind: 'switch', outputs: ['left', 'right'] },
    { id: 'blue', x: 200, y: 300, kind: 'station', color: 0, outputs: [] },
    { id: 'yellow', x: 400, y: 300, kind: 'station', color: 1, outputs: [] },
  ],
  edges: [
    {
      id: 'approach',
      from: 'depot',
      to: 'switch',
      points: [
        { x: 300, y: 400 },
        { x: 300, y: 300 },
      ],
    },
    {
      id: 'left',
      from: 'switch',
      to: 'blue',
      points: [
        { x: 300, y: 300 },
        { x: 200, y: 300 },
      ],
    },
    {
      id: 'right',
      from: 'switch',
      to: 'yellow',
      points: [
        { x: 300, y: 300 },
        { x: 400, y: 300 },
      ],
    },
  ],
};

function seededRandom(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function expectSameRun(actual: RunState, expected: RunState): void {
  expect({ ...actual, elapsed: 0, trains: [], deliveries: [] }).toEqual({ ...expected, elapsed: 0, trains: [], deliveries: [] });
  expect(actual.elapsed).toBeCloseTo(expected.elapsed, 8);
  expect(actual.trains).toHaveLength(expected.trains.length);
  actual.trains.forEach((train, index) => {
    expect({ ...train, distance: 0 }).toEqual({ ...expected.trains[index], distance: 0 });
    expect(train.distance).toBeCloseTo(expected.trains[index].distance, 7);
  });
  expect(actual.deliveries).toHaveLength(expected.deliveries.length);
  actual.deliveries.forEach((delivery, index) => {
    expect({ ...delivery, at: 0 }).toEqual({ ...expected.deliveries[index], at: 0 });
    expect(delivery.at).toBeCloseTo(expected.deliveries[index].at, 8);
  });
}

describe('continuous railway simulation', () => {
  it.each(LEVELS)('$id delivers every color under every configuration without losing any train', (source) => {
    const level = { ...source, spawnEvery: 1000 };
    const switches = level.nodes.filter((node) => node.kind === 'switch');
    const stations = level.nodes.filter((node) => node.kind === 'station');
    const reached = new Set<string>();
    for (let mask = 0; mask < 2 ** switches.length; mask++) {
      const selection: Switches = Object.fromEntries(switches.map((node, index) => [node.id, (mask >> index) & 1]));
      for (let colorIndex = 0; colorIndex < stations.length; colorIndex++) {
        const random = () => (colorIndex + 0.5) / stations.length;
        let state = createRun(level, random);
        for (let frame = 0; frame < 800 && state.correct + state.wrong === 0; frame++) {
          state = advanceRun(level, state, selection, 0.025, random);
          expect(state.spawned).toEqual(1);
          expect(state.trains.length + state.correct + state.wrong).toEqual(state.spawned);
        }
        expect(state.trains).toEqual([]);
        expect(state.deliveries).toHaveLength(1);
        const delivery = state.deliveries[0];
        const station = stations.find((node) => node.id === delivery.stationId);
        assert(station);
        expect(delivery.correct).toEqual(station.color === stations[colorIndex].color);
        expect(state.correct).toEqual(Number(delivery.correct));
        expect(state.wrong).toEqual(Number(!delivery.correct));
        reached.add(delivery.stationId);
      }
    }
    expect([...reached].sort()).toEqual(stations.map((node) => node.id).sort());
  });

  it.each(LEVELS)('$id is independent of frame partitions, including curved edges and random previews', (level) => {
    const randomWhole = seededRandom(12345);
    const randomFrames = seededRandom(12345);
    const switches = initialSwitches(level);
    let whole = createRun(level, randomWhole);
    let frames = createRun(level, randomFrames);
    for (const interval of [0.1, 4.6, 7.3, 15.125, 40.375, 22.5]) {
      whole = advanceRun(level, whole, switches, interval, randomWhole);
      let remaining = interval;
      while (remaining > 1e-10) {
        const dt = Math.min(0.037, remaining);
        frames = advanceRun(level, frames, switches, dt, randomFrames);
        remaining -= dt;
      }
      expectSameRun(frames, whole);
    }
  });

  it.each(LEVELS)('$id keeps at least two trains active for most of a run', (level) => {
    const random = seededRandom(12345);
    const switches = initialSwitches(level);
    let state = createRun(level, random);
    let busyFrames = 0;
    for (let frame = 0; frame < 360; frame++) {
      state = advanceRun(level, state, switches, 0.25, random);
      if (state.trains.length >= 2) busyFrames++;
    }
    expect(busyFrames / 360).toBeGreaterThan(0.8);
    expect(state.finished).toEqual(true);
  });

  it('uses the switch at arrival, never before, and locks the selected edge afterwards', () => {
    const start = createRun(fixture, () => 0);
    const approaching = advanceRun(fixture, start, { switch: 0 }, 0.9, () => 0);
    expect(approaching.trains[0].edgeId).toEqual('approach');
    const turned = advanceRun(fixture, approaching, { switch: 1 }, 0.2, () => 0);
    expect(turned.trains[0].edgeId).toEqual('right');
    const delivered = advanceRun(fixture, turned, { switch: 0 }, 1, () => 0);
    expect(delivered.deliveries[0]).toMatchObject({ stationId: 'yellow', correct: false });

    const arrived = advanceRun(fixture, start, { switch: 0 }, 1, () => 0);
    expect(arrived.trains[0]).toMatchObject({ edgeId: 'left', distance: 0 });
    const locked = advanceRun(fixture, arrived, { switch: 1 }, 1, () => 0);
    expect(locked.deliveries[0]).toMatchObject({ stationId: 'blue', correct: true });
    expect(start.trains).toEqual([]);
    expect(approaching.trains[0]).toMatchObject({ edgeId: 'approach', distance: 90 });
  });

  it('keeps simultaneous and overlapping trains independent', () => {
    const state: RunState = {
      ...createRun(fixture, () => 0),
      elapsed: 0.5,
      spawned: 2,
      trains: [
        { id: 0, color: 0, edgeId: 'approach', distance: 50 },
        { id: 1, color: 1, edgeId: 'approach', distance: 50 },
      ],
    };
    const delivered = advanceRun(fixture, state, { switch: 0 }, 1.5, () => 0);
    expect(delivered.trains).toEqual([]);
    expect(delivered.correct).toEqual(1);
    expect(delivered.wrong).toEqual(1);
    expect(delivered.deliveries).toEqual([
      { id: 0, stationId: 'blue', correct: true, at: 2 },
      { id: 1, stationId: 'blue', correct: false, at: 2 },
    ]);
  });

  it('counts wrong terminal arrivals exactly once and expires only the visual delivery event', () => {
    let state = advanceRun(
      fixture,
      createRun(fixture, () => 0),
      { switch: 1 },
      2,
      () => 0,
    );
    expect(state.correct).toEqual(0);
    expect(state.wrong).toEqual(1);
    expect(state.trains).toEqual([]);
    state = advanceRun(fixture, state, { switch: 0 }, 0.9, () => 0);
    expect(state.deliveries).toHaveLength(1);
    state = advanceRun(fixture, state, { switch: 0 }, 0.01, () => 0);
    expect(state.deliveries).toEqual([]);
    expect(state.wrong).toEqual(1);
    expect(state.correct).toEqual(0);
    expect(state.elapsed).toBeCloseTo(2.91);
  });

  it('spawns at zero on the first positive step and on the fixed cadence, consuming the preview', () => {
    const samples = [0, 0.9, 0, 0.9];
    let calls = 0;
    const random = () => samples[calls++];
    let state = createRun(fixture, random);
    expect(state).toMatchObject({ elapsed: 0, spawned: 0, trains: [], nextColor: 0 });
    expect(calls).toEqual(1);
    expect(advanceRun(fixture, state, { switch: 0 }, 0, random)).toBe(state);
    state = advanceRun(fixture, state, { switch: 0 }, 0.1, random);
    expect(state.trains[0]).toMatchObject({ color: 0, distance: 10 });
    expect(state.nextColor).toEqual(1);
    state = advanceRun(fixture, state, { switch: 0 }, 9.8, random);
    expect(state.spawned).toEqual(1);
    state = advanceRun(fixture, state, { switch: 0 }, 0.1, random);
    expect(state.spawned).toEqual(2);
    expect(state.trains[0]).toMatchObject({ id: 1, color: 1, distance: 0 });
    expect(state.nextColor).toEqual(0);
    expect(calls).toEqual(3);
  });

  it('clamps huge steps at exactly 90 seconds without a spawn or score after the deadline', () => {
    const level = { ...fixture, spawnEvery: 1 };
    const state = advanceRun(
      level,
      createRun(level, () => 0),
      { switch: 0 },
      10000,
      () => 0,
    );
    expect(TOTAL_TIME).toEqual(90);
    expect(state.elapsed).toEqual(90);
    expect(state.spawned).toEqual(90);
    expect(state.correct).toEqual(89);
    expect(state.wrong).toEqual(0);
    expect(state.finished).toEqual(true);
    expect(state.trains).toHaveLength(1);
    expect(state.trains[0]).toMatchObject({ id: 89, edgeId: 'left', distance: 0 });
    expect(state.deliveries).toEqual([{ id: 88, stationId: 'blue', correct: true, at: 90 }]);
    expect(advanceRun(level, state, { switch: 1 }, 10000, () => 0.9)).toBe(state);
  });

  it('does not score a train that arrives just after the deadline', () => {
    const state: RunState = {
      ...createRun(fixture, () => 0),
      elapsed: 89.5,
      spawned: 9,
      trains: [{ id: 8, color: 0, edgeId: 'left', distance: 49.99 }],
    };
    const finished = advanceRun(fixture, state, { switch: 0 }, 10, () => 0);
    expect(finished.correct).toEqual(0);
    expect(finished.trains).toHaveLength(1);
    expect(finished.trains[0].distance).toBeCloseTo(99.99);
  });

  it('throws on malformed routes and invalid switch values instead of silently dropping trains', () => {
    const state = createRun(fixture, () => 0);
    expect(() => advanceRun(fixture, state, {}, 1)).toThrow('Invalid switch');
    expect(() => advanceRun(fixture, state, { switch: 2 }, 1)).toThrow('Invalid switch');
    expect(() => advanceRun(fixture, { ...state, trains: [{ id: 99, color: 0, edgeId: 'missing', distance: 0 }] }, { switch: 0 }, 1)).toThrow('Unknown train edge');
    expect(() => createRun({ ...fixture, edges: fixture.edges.slice(1) })).toThrow('Invalid railway');
    expect(() => createRun({ ...fixture, nodes: fixture.nodes.map((node) => (node.id === 'switch' ? { ...node, outputs: [] } : node)) })).toThrow('Invalid railway');
    expect(() => createRun({ ...fixture, spawnEvery: 0 })).toThrow('Invalid railway');
    expect(() => advanceRun(fixture, state, { switch: 0 }, -1)).toThrow('Time step');
    expect(() => advanceRun(fixture, state, { switch: 0 }, Number.NaN)).toThrow('Time step');
    expect(() => createRun(fixture, () => 1)).toThrow('Random source');
  });
});
