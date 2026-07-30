import type { Continent, Country, GameState } from '../types';
import { pickRoundCountries } from './countries';
import { haversineKm, temperatureFor } from './geo';

export function initialState(): GameState {
  return {
    status: 'start',
    queue: [],
    index: 0,
    score: 0,
    solved: 0,
    currentMisses: 0,
    lastWrongAlpha3: null,
    lastCorrectAlpha3: null,
    hint: null,
  };
}

export function startRound(pool: readonly Country[], continent?: Continent): GameState {
  return {
    ...initialState(),
    status: 'playing',
    queue: pickRoundCountries(pool, continent),
    index: 0,
  };
}

export function currentTarget(state: GameState): Country | null {
  return state.queue[state.index] ?? null;
}

export type GuessResult = {
  readonly state: GameState;
  readonly correct: boolean;
};

// Evaluate a click on a country polygon. Unlimited guesses; +1 score only on first try.
export function guess(state: GameState, guessed: Country): GuessResult {
  const target = currentTarget(state);
  if (!target || state.status !== 'playing') return { state, correct: false };

  if (guessed.alpha3 === target.alpha3) {
    const firstTry = state.currentMisses === 0;
    return {
      correct: true,
      state: {
        ...state,
        score: firstTry ? state.score + 1 : state.score,
        solved: state.solved + 1,
        lastCorrectAlpha3: target.alpha3,
        lastWrongAlpha3: null,
        hint: null,
      },
    };
  }

  const distanceKm = haversineKm(guessed.lat, guessed.lon, target.lat, target.lon);
  return {
    correct: false,
    state: {
      ...state,
      currentMisses: state.currentMisses + 1,
      lastWrongAlpha3: guessed.alpha3,
      lastCorrectAlpha3: null,
      hint: { distanceKm, temperature: temperatureFor(distanceKm), guessedName: guessed.name },
    },
  };
}

// Move to the next target, or end the round when the queue is exhausted.
export function advance(state: GameState): GameState {
  const nextIndex = state.index + 1;
  if (nextIndex >= state.queue.length) {
    return { ...state, status: 'roundEnd', lastCorrectAlpha3: null, lastWrongAlpha3: null, hint: null };
  }
  return {
    ...state,
    index: nextIndex,
    currentMisses: 0,
    lastCorrectAlpha3: null,
    lastWrongAlpha3: null,
    hint: null,
  };
}

export function clearFlash(state: GameState): GameState {
  return { ...state, lastWrongAlpha3: null };
}

// Assist kicks in once the player has missed the current target enough times.
export const ASSIST_AFTER_MISSES = 2;

export function shouldAssist(state: GameState): boolean {
  return state.status === 'playing' && state.currentMisses >= ASSIST_AFTER_MISSES;
}

export type RoundRating = { readonly title: string; readonly emoji: string };

export function rateRound(score: number, total: number): RoundRating {
  const pct = total === 0 ? 0 : score / total;
  if (pct === 1) return { title: 'Cartographer', emoji: '🗺️' };
  if (pct >= 0.8) return { title: 'Globetrotter', emoji: '🌍' };
  if (pct >= 0.5) return { title: 'Explorer', emoji: '🧭' };
  if (pct >= 0.2) return { title: 'Wanderer', emoji: '🚶' };
  return { title: 'Tourist', emoji: '🎒' };
}
