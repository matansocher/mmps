import { LOGIC_MAX_GUESSES, type LogicClue, type LogicPuzzle } from '../../../../src/shared/worldly/logic-puzzle';
import { LOGIC_DIFFICULTY_LABELS } from './modes';

// Puzzles are keyed by day, so puzzle #N is also the Worldly bot's daily puzzle for that day.
export const LOGIC_PUZZLE_COUNT = 3650;

// Format: "YYYY-MM-DD", puzzle #1 is 2026-01-01.
export function randomLogicDay(random: () => number = Math.random): string {
  const offset = Math.floor(random() * LOGIC_PUZZLE_COUNT);
  return new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10);
}

export type LogicPhase = 'playing' | 'won' | 'lost';

export type LogicState = {
  readonly puzzle: LogicPuzzle;
  readonly guesses: readonly string[];
  readonly phase: LogicPhase;
};

const phaseFor = (puzzle: LogicPuzzle, guesses: readonly string[]): LogicPhase =>
  guesses.at(-1) === puzzle.answer ? 'won' : guesses.length >= LOGIC_MAX_GUESSES ? 'lost' : 'playing';

export function guessLogic(state: LogicState, code: string): LogicState {
  if (state.phase !== 'playing' || state.guesses.includes(code)) return state;
  const guesses = [...state.guesses, code];
  return { ...state, guesses, phase: phaseFor(state.puzzle, guesses) };
}

// Replays saved guesses so a reload resumes (or shows) today's game instead of resetting it.
export function createLogic(puzzle: LogicPuzzle, saved: readonly string[] = []): LogicState {
  return saved.reduce(guessLogic, { puzzle, guesses: [], phase: 'playing' } as LogicState);
}

const wrongGuesses = (state: LogicState) => state.guesses.filter((code) => code !== state.puzzle.answer).length;

// One clue to start, one more per wrong tap; everything once the game is over.
export function revealedClues(state: LogicState): readonly LogicClue[] {
  if (state.phase !== 'playing') return state.puzzle.clues;
  return state.puzzle.clues.slice(0, Math.min(state.puzzle.clues.length, wrongGuesses(state) + 1));
}

export const logicScore = (state: LogicState): number => (state.phase === 'won' ? LOGIC_MAX_GUESSES + 1 - state.guesses.length : 0);

export function logicShareText(state: LogicState): string {
  const tally = state.phase === 'won' ? `${state.guesses.length}/${LOGIC_MAX_GUESSES}` : `X/${LOGIC_MAX_GUESSES}`;
  const squares = state.guesses.map((code) => (code === state.puzzle.answer ? '🟩' : '🟥')).join('');
  return `🧩 Earth Logic #${state.puzzle.number} · ${LOGIC_DIFFICULTY_LABELS[state.puzzle.difficulty]} ${tally}\n${squares}`;
}
