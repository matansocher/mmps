import type { SavedRoom } from '../../../../src/shared/rewind';
import { createState, step } from './engine';
import { isAvailable } from './progress';
import type { Progress } from './progress';
import type { Session } from './session';
import { DIRECTIONS } from './types';
import type { GameState, Level, StepAction } from './types';

export const CHECKPOINT_KEY = 'rewind.solo.run.v2';
const signature = (level: Level) => JSON.stringify(['solo-1', level.map]);
function isAction(value: unknown): value is StepAction {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  if (value.type === 'move') return 'move' in value && DIRECTIONS.some((direction) => direction === value.move);
  return value.type === 'interact' && 'position' in value && Number.isSafeInteger(value.position);
}

export function readCheckpoint(storage: Pick<Storage, 'getItem'>, levels: readonly Level[], progress: Progress): Session | null {
  const raw = storage.getItem(CHECKPOINT_KEY);
  if (!raw) return null;
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== 'object' || !('id' in saved) || !('signature' in saved) || !('actions' in saved)) throw new Error('Invalid saved room');
  const level = levels.find((level) => level.id === saved.id);
  if (!level || !isAvailable(progress, level.id) || saved.signature !== signature(level) || !Array.isArray(saved.actions) || !saved.actions.every(isAction))
    throw new Error('Saved room has changed or is invalid');
  let state = createState(level);
  const history: GameState[] = [];
  for (const action of saved.actions) {
    if (state.won) throw new Error('Saved room continues after completion');
    history.push(state);
    state = step(state, action);
  }
  return { state, history, actions: saved.actions };
}
export function saveCheckpoint(storage: Pick<Storage, 'setItem'>, session: Session): void {
  storage.setItem(CHECKPOINT_KEY, JSON.stringify({ id: session.state.level.id, signature: signature(session.state.level), actions: session.actions }));
}

const MOVE_CODES = { up: 'U', right: 'R', down: 'D', left: 'L' } as const;
export function packRoom(session: Session): SavedRoom {
  return {
    id: session.state.level.id,
    signature: signature(session.state.level),
    moves: session.actions.map((action) => (action.type === 'move' ? MOVE_CODES[action.move] : `I${action.position};`)).join(''),
  };
}

export function restoreRoom(room: SavedRoom, levels: readonly Level[], progress: Progress): Session {
  const moves = { U: 'up', R: 'right', D: 'down', L: 'left' } as const;
  const actions: StepAction[] = [];
  const codes = room.moves.match(/[URDL]|I\d{1,4};/g) ?? [];
  if (codes.join('') !== room.moves) throw new Error('Saved moves are invalid');
  for (const code of codes) {
    if (code.startsWith('I')) actions.push({ type: 'interact', position: Number(code.slice(1, -1)) });
    else actions.push({ type: 'move', move: moves[code as keyof typeof moves] });
  }
  const session = readCheckpoint({ getItem: () => JSON.stringify({ id: room.id, signature: room.signature, actions }) }, levels, progress);
  if (!session) throw new Error('Saved room is missing');
  return session;
}
