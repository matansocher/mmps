import { DIRECTIONS } from './types';
import type { Board, Direction, GameEvent, GameState, Level, StepAction } from './types';

export const isPlate = (tile: string) => /^[a-f]$/.test(tile);
export const isDoor = (tile: string) => /^[A-F]$/.test(tile) && tile !== 'C' && tile !== 'E';
export const isKey = (tile: string) => tile === 'k' || tile === 'j';
export const isLock = (tile: string) => tile === 'K' || tile === 'J';
export const isTunnel = (tile: string) => /^[0-9]$/.test(tile);
export const isBridge = (tile: string) => tile === '-' || tile === '|';
export const isMirror = (tile: string) => tile === '/' || tile === '\\';
export const ONE_WAY: Readonly<Record<string, Direction>> = { '^': 'up', '>': 'right', v: 'down', '<': 'left' };

export function parseBoard(level: Level): Board {
  const width = level.map[0]?.length ?? 0;
  const tiles = level.map.join('').split('');
  if (!width || level.map.some((row) => row.length !== width) || tiles.some((tile) => !'#.SECabcdefABDFkjKJ~,|-^>v<lGH0123456789/\\*oL'.includes(tile))) {
    throw new Error(`Invalid map: ${level.id} ${level.name}`);
  }
  if (tiles.filter((tile) => tile === 'S').length !== 1 || tiles.filter((tile) => tile === 'E').length !== 1) throw new Error(`Room ${level.id} needs one start and one exit`);
  for (const tile of new Set(tiles)) {
    if (isDoor(tile) && !tiles.includes(tile.toLowerCase())) throw new Error(`Room ${level.id}: gate ${tile} has no switch`);
    if (isTunnel(tile) && tiles.filter((item) => item === tile).length !== 2) throw new Error(`Room ${level.id}: tunnel ${tile} needs a pair`);
    if (isLock(tile) && !tiles.includes(tile.toLowerCase())) throw new Error(`Room ${level.id}: lock ${tile} has no key`);
  }
  return { width, height: level.map.length, tiles, start: tiles.indexOf('S'), exit: tiles.indexOf('E'), initialCrates: tiles.flatMap((tile, position) => (tile === 'C' ? [position] : [])) };
}

export function createState(level: Level): GameState {
  const board = parseBoard(level);
  return {
    level,
    board,
    player: board.start,
    crates: [...board.initialCrates],
    keys: [],
    collectedKeys: [],
    unlockedLocks: [],
    collapsed: [],
    flippedBridges: [],
    flippedMirrors: [],
    leverOn: false,
    moves: 0,
    won: false,
    events: [],
    message: '',
  };
}

export function destination(board: Board, position: number, move: Direction): number {
  const x = position % board.width;
  const y = Math.floor(position / board.width);
  if ((move === 'left' && x === 0) || (move === 'right' && x === board.width - 1) || (move === 'up' && y === 0) || (move === 'down' && y === board.height - 1)) return -1;
  return position + (move === 'left' ? -1 : move === 'right' ? 1 : move === 'up' ? -board.width : board.width);
}

export function openDoors(state: Pick<GameState, 'board' | 'player' | 'crates'>): ReadonlySet<string> {
  return new Set(
    [state.player, ...state.crates]
      .map((position) => state.board.tiles[position])
      .filter(isPlate)
      .map((tile) => tile.toUpperCase()),
  );
}

export function mirrorShape(state: GameState, position: number): string {
  const shape = state.board.tiles[position];
  return state.flippedMirrors.includes(position) ? (shape === '/' ? '\\' : '/') : shape;
}

export function bridgeIsHorizontal(state: GameState, position: number): boolean {
  return (state.board.tiles[position] === '-') !== state.flippedBridges.includes(position);
}

export function lightPaths(state: GameState): { readonly paths: readonly (readonly number[])[]; readonly lit: ReadonlySet<number>; readonly powered: boolean } {
  const paths: number[][] = [];
  const lit = new Set<number>();
  for (const source of state.board.tiles.flatMap((tile, position) => (tile === '*' ? [position] : []))) {
    const path = [source];
    const seen = new Set<string>();
    let position = source;
    let direction: Direction = 'right';
    while (true) {
      const next = destination(state.board, position, direction);
      const tile = state.board.tiles[next];
      if (next < 0 || tile === '#' || state.crates.includes(next) || (isLock(tile) && !state.unlockedLocks.includes(next))) break;
      const key = `${next}:${direction}`;
      if (seen.has(key)) break;
      seen.add(key);
      path.push(next);
      if (tile === 'o') lit.add(next);
      if (isMirror(tile)) {
        const directions: Readonly<Record<Direction, Direction>> =
          mirrorShape(state, next) === '/' ? { up: 'right', right: 'up', down: 'left', left: 'down' } : { up: 'left', left: 'up', down: 'right', right: 'down' };
        direction = directions[direction];
      }
      position = next;
    }
    paths.push(path);
  }
  const receivers = state.board.tiles.flatMap((tile, position) => (tile === 'o' ? [position] : []));
  return { paths, lit, powered: receivers.length > 0 && receivers.every((position) => lit.has(position)) };
}

export function availableInteractions(state: GameState): readonly number[] {
  const near = [state.player, ...DIRECTIONS.map((move) => destination(state.board, state.player, move))];
  return near.filter((position) => {
    const tile = state.board.tiles[position];
    return tile === 'l' || isMirror(tile) || (isBridge(tile) && position !== state.player && !state.crates.includes(position));
  });
}

export function interactionLabel(state: GameState, position: number): string {
  return state.board.tiles[position] === 'l' ? 'Pull lever' : isMirror(state.board.tiles[position]) ? 'Turn mirror' : 'Turn bridge';
}

function canEnter(state: GameState, from: number, to: number, direction: Direction, crate: boolean): boolean {
  const tile = state.board.tiles[to];
  if (to < 0 || tile === '#' || tile === '*' || isMirror(tile) || state.collapsed.includes(to)) return false;
  if (isDoor(tile) && !openDoors(state).has(tile)) return false;
  if ((tile === 'G' && !state.leverOn) || (tile === 'H' && state.leverOn) || (tile === 'L' && !lightPaths(state).powered)) return false;
  if (isLock(tile) && !state.unlockedLocks.includes(to) && (crate || !state.keys.includes(tile.toLowerCase()))) return false;
  for (const position of [from, to]) {
    const surface = state.board.tiles[position];
    if (ONE_WAY[surface] && ONE_WAY[surface] !== direction) return false;
    if (isBridge(surface) && bridgeIsHorizontal(state, position) !== (direction === 'left' || direction === 'right')) return false;
  }
  return true;
}

function blockedMessage(state: GameState, position: number): string {
  const tile = state.board.tiles[position];
  if (state.collapsed.includes(position)) return 'That floor has fallen away. Undo to recover your route.';
  if (isBridge(tile) || isBridge(state.board.tiles[state.player])) return 'The bridge points the other way. Stand beside it and use Turn bridge.';
  if (isDoor(tile)) return `Gate ${tile} needs weight on its matching switch.`;
  if (isLock(tile)) return 'Find the key with the matching shape before opening this lock.';
  if (tile === 'G' || tile === 'H') return 'A lever changes which gates are open.';
  if (tile === 'L') return 'Light every receiver to open this gate. Turn a mirror to redirect the beam.';
  if (isMirror(tile)) return 'Mirrors stay in place. Stand beside one and use Turn mirror.';
  if (ONE_WAY[tile] || ONE_WAY[state.board.tiles[state.player]]) return 'This gate only lets you travel in the arrow direction.';
  return state.crates.includes(position) ? 'The barrel needs somewhere to go. Try another side, or undo.' : 'The way is blocked. Try another direction, or undo.';
}

export function step(state: GameState, action: StepAction): GameState {
  if (state.won) return state;
  const events: GameEvent[] = [];
  let next = { ...state, moves: state.moves + 1, events, message: '' };
  const toggle = (items: readonly number[], position: number) => (items.includes(position) ? items.filter((item) => item !== position) : [...items, position]);
  if (action.type === 'interact') {
    if (!availableInteractions(state).includes(action.position)) throw new Error('Interaction target is not reachable');
    const tile = state.board.tiles[action.position];
    if (tile === 'l') {
      next = { ...next, leverOn: !state.leverOn };
      events.push('lever');
    } else if (isMirror(tile)) {
      next = { ...next, flippedMirrors: toggle(state.flippedMirrors, action.position) };
      events.push('mirror');
    } else {
      next = { ...next, flippedBridges: toggle(state.flippedBridges, action.position) };
      events.push('bridge');
    }
    return next;
  }

  const departed = new Set<number>();
  function transport(position: number, crate: boolean): number {
    const tile = state.board.tiles[position];
    if (!isTunnel(tile)) return position;
    const pair = state.board.tiles.findIndex((item, index) => item === tile && index !== position);
    if (next.crates.includes(pair) || (crate && pair === next.player)) return crate ? -1 : position;
    events.push('tunnel');
    return pair;
  }
  function collect(position: number) {
    const tile = state.board.tiles[position];
    if (isKey(tile) && !next.collectedKeys.includes(position)) {
      next = { ...next, keys: [...next.keys, tile], collectedKeys: [...next.collectedKeys, position] };
      events.push('key');
    }
    if (isLock(tile) && !next.unlockedLocks.includes(position)) {
      const key = next.keys.indexOf(tile.toLowerCase());
      next = { ...next, keys: next.keys.filter((_, index) => index !== key), unlockedLocks: [...next.unlockedLocks, position] };
      events.push('lock');
    }
  }

  const target = destination(state.board, state.player, action.move);
  let moved = false;
  if (canEnter(next, next.player, target, action.move, false)) {
    const crate = next.crates.indexOf(target);
    let canWalk = true;
    if (crate >= 0) {
      const pushed = destination(next.board, target, action.move);
      canWalk = canEnter(next, target, pushed, action.move, true) && !next.crates.includes(pushed) && pushed !== next.player;
      if (canWalk) {
        let end = transport(pushed, true);
        if (end < 0) canWalk = false;
        else {
          departed.add(target);
          next = { ...next, crates: next.crates.map((position, index) => (index === crate ? end : position)) };
          while (next.board.tiles[end] === '~') {
            const following = destination(next.board, end, action.move);
            if (!canEnter(next, end, following, action.move, true) || next.crates.includes(following) || following === next.player) break;
            const landing = transport(following, true);
            if (landing < 0) break;
            departed.add(end);
            end = landing;
            next = { ...next, crates: next.crates.map((position, index) => (index === crate ? end : position)) };
            events.push('slide');
          }
          events.push('push');
        }
      }
    }
    if (canWalk) {
      departed.add(next.player);
      next = { ...next, player: transport(target, false) };
      collect(next.player);
      moved = true;
      while (next.board.tiles[next.player] === '~') {
        const following = destination(next.board, next.player, action.move);
        if (!canEnter(next, next.player, following, action.move, false) || next.crates.includes(following)) break;
        departed.add(next.player);
        next = { ...next, player: transport(following, false) };
        collect(next.player);
        events.push('slide');
      }
    }
  }
  if (!moved) return { ...state, moves: state.moves + 1, events: ['blocked'], message: blockedMessage(state, target) };
  const collapsed = [
    ...next.collapsed,
    ...[...departed].filter((position) => next.board.tiles[position] === ',' && position !== next.player && !next.crates.includes(position) && !next.collapsed.includes(position)),
  ];
  if (collapsed.length !== next.collapsed.length) events.push('crumble');
  const won = next.player === next.board.exit;
  events.push(won ? 'complete' : 'move');
  return { ...next, collapsed, won };
}

export function play(state: GameState, move: Direction): GameState {
  return step(state, { type: 'move', move });
}
