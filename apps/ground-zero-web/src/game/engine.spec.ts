import { describe, expect, it } from 'vitest';
import { createGameState, resetGame, stepGame } from './engine';
import { parseFloor } from './levels';
import type { FloorDefinition, GameState } from './types';
import { isPlayerDetected, visionTiles } from './vision';

function floor(overrides: Partial<FloorDefinition> = {}) {
  return parseFloor({
    id: 'test-floor',
    name: 'Test Floor',
    template: ['#######', '#P.OE.#', '#..H..#', '#.....#', '#######'],
    guards: [],
    visionDepth: 3,
    guardMoveEveryTicks: 2,
    ...overrides,
  });
}

describe('game engine', () => {
  it('blocks player movement through walls', () => {
    const state = createGameState(floor());
    const result = stepGame(state, 'up', 100);

    expect(result.state.player.position).toEqual({ row: 1, column: 1 });
  });

  it('requires the objective before completing at the exit', () => {
    let state = createGameState(floor());
    state = stepGame(state, 'right', 100).state;
    state = stepGame(state, 'right', 200).state;
    expect(state.player.hasObjective).toEqual(true);

    state = stepGame(state, 'right', 300).state;
    expect(state.status).toEqual('completed');
    expect(state.completedAt).toEqual(300);
  });

  it('marks a player on a hiding tile as hidden', () => {
    let state = createGameState(floor());
    state = stepGame(state, 'down').state;
    state = stepGame(state, 'right').state;
    state = stepGame(state, 'right').state;

    expect(state.player.position).toEqual({ row: 2, column: 3 });
    expect(state.player.isHidden).toEqual(true);
  });

  it('moves guards at the configured tick interval and reverses patrols', () => {
    const parsed = floor({
      guards: [{ id: 'guard', behavior: 'patrol', patrol: [{ row: 3, column: 1 }, { row: 3, column: 2 }] }],
    });
    let state: GameState = {
      ...createGameState(parsed),
      player: {
        ...createGameState(parsed).player,
        isHidden: true,
      },
    };

    state = stepGame(state, null).state;
    expect(state.guards[0].position).toEqual({ row: 3, column: 1 });
    state = stepGame(state, null).state;
    expect(state.guards[0].position).toEqual({ row: 3, column: 2 });
    state = stepGame(state, null).state;
    state = stepGame(state, null).state;
    expect(state.guards[0].position).toEqual({ row: 3, column: 1 });
  });

  it('rotates stationary sentries without moving them', () => {
    const parsed = floor({
      guards: [{ id: 'sentry', behavior: 'sentry', position: { row: 3, column: 3 }, facingSequence: ['left', 'up', 'right'], rotateEveryTicks: 2 }],
    });
    const initial = createGameState(parsed);
    let state = {
      ...initial,
      player: {
        ...initial.player,
        isHidden: true,
      },
    };

    state = stepGame(state, null).state;
    expect(state.guards[0]).toMatchObject({ position: { row: 3, column: 3 }, direction: 'left' });
    state = stepGame(state, null).state;
    expect(state.guards[0]).toMatchObject({ position: { row: 3, column: 3 }, direction: 'up' });
    state = stepGame(state, null).state;
    state = stepGame(state, null).state;
    expect(state.guards[0]).toMatchObject({ position: { row: 3, column: 3 }, direction: 'right' });
  });

  it('restores the original floor snapshot after reset', () => {
    const initial = createGameState(floor());
    const moved = stepGame(initial, 'right').state;

    expect(resetGame(moved)).toEqual(initial);
  });
});

describe('guard vision', () => {
  it('stops vision at walls', () => {
    const parsed = floor({
      template: ['#######', '#P#OE.#', '#.....#', '#.....#', '#######'],
      guards: [{ id: 'guard', behavior: 'patrol', patrol: [{ row: 1, column: 5 }, { row: 1, column: 4 }] }],
    });
    const state = createGameState(parsed);

    expect(visionTiles(state, state.guards[0])).toContainEqual({ row: 1, column: 4 });
    expect(visionTiles(state, state.guards[0])).toContainEqual({ row: 1, column: 3 });
    expect(isPlayerDetected(state)).toEqual(false);
  });

  it('includes diagonal tiles inside the 90-degree field of view', () => {
    const parsed = floor({
      guards: [{ id: 'guard', behavior: 'sentry', position: { row: 3, column: 3 }, facingSequence: ['up', 'right'], rotateEveryTicks: 5 }],
    });
    const state = createGameState(parsed);
    const visible = visionTiles(state, state.guards[0]);

    expect(visible).toContainEqual({ row: 2, column: 2 });
    expect(visible).toContainEqual({ row: 2, column: 3 });
    expect(visible).toContainEqual({ row: 2, column: 4 });
    expect(visible).not.toContainEqual({ row: 3, column: 4 });
  });

  it('blocks cone tiles hidden behind a wall', () => {
    const parsed = floor({
      template: ['#######', '#P.OE.#', '#..#..#', '#.....#', '#######'],
      guards: [{ id: 'guard', behavior: 'sentry', position: { row: 3, column: 3 }, facingSequence: ['up', 'right'], rotateEveryTicks: 5 }],
    });
    const visible = visionTiles(createGameState(parsed), createGameState(parsed).guards[0]);

    expect(visible).not.toContainEqual({ row: 1, column: 3 });
  });

  it('does not detect hidden players', () => {
    const parsed = floor({
      template: ['#######', '#POE..#', '#.....#', '#.....#', '#######'],
      guards: [{ id: 'guard', behavior: 'patrol', patrol: [{ row: 1, column: 5 }, { row: 1, column: 4 }] }],
    });
    const state = {
      ...createGameState(parsed),
      player: {
        ...createGameState(parsed).player,
        position: { row: 1, column: 1 },
        hasObjective: false,
        isHidden: true,
      },
    };

    expect(isPlayerDetected(state)).toEqual(false);
  });
});

describe('guard awareness', () => {
  it('builds suspicion while watched and decays it when unseen', () => {
    const parsed = floor({
      guards: [{ id: 'watcher', behavior: 'sentry', position: { row: 3, column: 3 }, facingSequence: ['up', 'right'], rotateEveryTicks: 99 }],
    });
    let state = stepGame(createGameState(parsed), null).state;

    expect(state.suspicion).toEqual(parsed.suspicionPerTick);

    state = stepGame({ ...state, guards: [], suspicion: 50 }, null).state;
    expect(state.suspicion).toEqual(50 - parsed.suspicionDecayPerTick);
  });

  it('emits movement noise and sends nearby guards to investigate it', () => {
    const parsed = floor({
      guards: [{ id: 'listener', behavior: 'sentry', position: { row: 3, column: 1 }, facingSequence: ['down', 'left'], rotateEveryTicks: 99 }],
    });
    const state = stepGame(createGameState(parsed), 'right').state;

    expect(state.noise).toEqual({
      position: { row: 1, column: 2 },
      radius: parsed.playerNoiseRadius,
      expiresAtTick: 3,
    });
    expect(state.guards[0].mode).toEqual('investigate');
    expect(state.guards[0].investigationTarget).toEqual({ row: 1, column: 2 });
  });

  it('searches an investigation target before returning to routine', () => {
    const parsed = floor({
      guards: [{ id: 'searcher', behavior: 'sentry', position: { row: 3, column: 3 }, facingSequence: ['down', 'left'], rotateEveryTicks: 99 }],
    });
    const initial = createGameState(parsed);
    let state: GameState = {
      ...initial,
      player: { ...initial.player, isHidden: true },
      guards: [{ ...initial.guards[0], mode: 'investigate' as const, investigationTarget: { row: 3, column: 3 } }],
    };

    state = stepGame(state, null).state;
    expect(state.guards[0].mode).toEqual('search');
    expect(state.guards[0].searchTicksRemaining).toEqual(parsed.searchDurationTicks);

    for (let tick = 0; tick < parsed.searchDurationTicks; tick += 1) state = stepGame(state, null).state;
    expect(state.guards[0].mode).toEqual('return');

    state = stepGame(state, null).state;
    expect(state.guards[0].mode).toEqual('routine');
    expect(state.guards[0].position).toEqual(state.guards[0].homePosition);
  });

  it('triggers an immediate alarm on direct contact', () => {
    const parsed = floor({
      guards: [{ id: 'blocker', behavior: 'sentry', position: { row: 1, column: 2 }, facingSequence: ['down', 'left'], rotateEveryTicks: 99 }],
    });
    const state = stepGame(createGameState(parsed), 'right').state;

    expect(state.status).toEqual('caught');
    expect(state.suspicion).toEqual(100);
  });
});

describe('interactive levels', () => {
  it('blocks locked doors until the player collects a keycard', () => {
    const parsed = floor({
      template: ['#######', '#PD.OE#', '#K....#', '#.....#', '#######'],
    });
    let state = stepGame(createGameState(parsed), 'right').state;
    expect(state.player.position).toEqual({ row: 1, column: 1 });
    expect(state.interaction?.kind).toEqual('door-locked');

    state = stepGame(state, 'down').state;
    expect(state.player.hasKeycard).toEqual(true);
    expect(state.interaction?.kind).toEqual('keycard');

    state = stepGame(state, 'up').state;
    state = stepGame(state, 'right').state;
    expect(state.player.position).toEqual({ row: 1, column: 2 });
  });

  it('moves the player between paired vents', () => {
    const parsed = floor({
      template: ['#######', '#PV.OE#', '#...V.#', '#.....#', '#######'],
      ventPairs: [{ first: { row: 1, column: 2 }, second: { row: 2, column: 4 } }],
    });
    const result = stepGame(createGameState(parsed), 'right');

    expect(result.ventUsed).toEqual(true);
    expect(result.state.player.position).toEqual({ row: 2, column: 4 });
    expect(result.state.interaction?.kind).toEqual('vent');
  });
});
