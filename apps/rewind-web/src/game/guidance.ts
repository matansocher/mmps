import { bridgeIsHorizontal, isBridge, isDoor, isKey, isLock, isMirror, isPlate, isTunnel, lightPaths, ONE_WAY, openDoors } from './engine';
import { introductionById } from './levels';
import type { Concept, GameState, Level } from './types';

export type Guidance = { readonly title: string; readonly detail: string; readonly target?: number; readonly label?: string };

export function conceptsInLevel(level: Level): readonly Concept[] {
  const tiles = level.map.join('');
  const found: Concept[] = [];
  if (tiles.includes('C')) found.push('barrel');
  if ([...tiles].some((tile) => isPlate(tile) || isDoor(tile))) found.push('switch');
  if (/[kjKJ]/.test(tiles)) found.push('key');
  if (tiles.includes('~')) found.push('ice');
  if (tiles.includes(',')) found.push('crumble');
  if (/[-|]/.test(tiles)) found.push('bridge');
  if (/[\^>v<]/.test(tiles)) found.push('one-way');
  if (/[lGH]/.test(tiles)) found.push('lever');
  if (/[0-9]/.test(tiles)) found.push('tunnel');
  if (/[*/\\oL]/.test(tiles)) found.push('light');
  return found;
}

export function inspectObject(state: GameState, position: number): Guidance | null {
  const tile = state.board.tiles[position];
  const result = (title: string, detail: string, label: string): Guidance => ({ title, detail, label, target: position });
  if (state.crates.includes(position)) return result('A barrel you can move.', 'Walk into it to push one tile. You cannot pull it; Undo always lets you try another side.', 'PUSHABLE BARREL');
  if (state.collapsed.includes(position)) return result('The paving has fallen.', 'This tile is no longer passable. Undo restores it along with your previous position.', 'FALLEN FLOOR');
  if (isPlate(tile)) return result('A switch that needs weight.', `Your weight or a barrel lifts gate ${tile.toUpperCase()}. It closes again when the switch is empty.`, 'WEIGHTED SWITCH');
  if (isDoor(tile)) return result(`Gate ${tile}.`, 'The engraved line connects it to its matching switch. Keep weight on that switch.', openDoors(state).has(tile) ? 'GATE OPEN' : 'PRESSURE GATE');
  if (isKey(tile) && !state.collectedKeys.includes(position))
    return result('A key for a matching lock.', 'Walk over it to collect it. The round and square marks tell you which door it opens.', tile === 'k' ? 'ROUND KEY' : 'SQUARE KEY');
  if (isLock(tile))
    return result(
      'A door that stays open.',
      'Walk into it with the matching key. The key is used, but the door remains open until you restart or undo.',
      state.unlockedLocks.includes(position) ? 'UNLOCKED' : tile === 'K' ? 'ROUND LOCK' : 'SQUARE LOCK',
    );
  if (tile === '~') return result('A slippery patch.', 'You and barrels slide until dry ground or an obstacle. A sliding traveler stops before a barrel.', 'ICE');
  if (tile === ',') return result('A fragile paving stone.', 'After you or a barrel leave this tile empty, it falls away. Think about your return route.', 'CRUMBLING FLOOR');
  if (isBridge(tile))
    return result(
      'A bridge you can turn.',
      'Stand beside the empty bridge, then use Turn bridge. Its planks show the direction you can cross.',
      bridgeIsHorizontal(state, position) ? 'CROSS SIDEWAYS' : 'CROSS UP / DOWN',
    );
  if (ONE_WAY[tile]) return result('A one-way passage.', `Travel ${ONE_WAY[tile]} through this tile. You cannot turn or reverse while on it.`, 'ONE WAY');
  if (tile === 'l') return result('A handle for the whole circuit.', 'Stand beside it and use Pull lever. Sun gates and moon gates exchange which set is open.', 'TOGGLE LEVER');
  if (tile === 'G' || tile === 'H')
    return result(tile === 'G' ? 'The sun gate.' : 'The moon gate.', 'Pull a lever to swap the open gates. It stays that way until you pull another lever.', tile === 'G' ? 'SUN GATE' : 'MOON GATE');
  if (isTunnel(tile)) return result(`Tunnel ${tile}.`, 'This connects to the other tunnel with the same number. Barrels can travel too. A blocked destination needs clearing first.', `TUNNEL ${tile}`);
  if (isMirror(tile)) return result('A mirror for the light.', 'Stand beside it and use Turn mirror. Watch where the reflected ray goes.', 'TURN THE MIRROR');
  if (tile === '*') return result('A steady source of light.', 'Its beam points right. Mirrors turn it; barrels block it. The light cannot hurt you.', 'LIGHT SOURCE');
  if (tile === 'o')
    return result(
      'A receiver waiting for light.',
      'Light every round receiver to open the star gate. Trace the visible beams back to their mirrors.',
      lightPaths(state).lit.has(position) ? 'RECEIVER LIT' : 'LIGHT RECEIVER',
    );
  if (tile === 'L') return result('The star gate.', 'Light every receiver in this room to open the way.', lightPaths(state).powered ? 'GATE OPEN' : 'STAR GATE');
  if (tile === 'E') return result('Your way out.', 'Step into the archway to finish the room. There is no move limit.', 'EXIT');
  return null;
}

function clearPassage(state: GameState): boolean {
  const queue = [state.player];
  const seen = new Set(queue);
  for (let head = 0; head < queue.length; head++) {
    const position = queue[head];
    if (position === state.board.exit) return true;
    for (const next of [position - state.board.width, position + state.board.width, position - 1, position + 1]) {
      if (next < 0 || next >= state.board.tiles.length || (Math.abs(next - position) === 1 && Math.floor(next / state.board.width) !== Math.floor(position / state.board.width))) continue;
      if (seen.has(next) || state.board.tiles[next] === '#' || state.crates.includes(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

export function getGuidance(state: GameState): Guidance {
  if (state.won) return { title: state.level.introduction ? 'Another little escape.' : 'A clever way through.', detail: 'Keep your stars, or revisit later for a shorter route.' };
  if (state.message) return { title: state.message, detail: '' };
  if (state.level.introduction === 1 && clearPassage(state))
    return { title: 'The passage is clear.', detail: 'Leave the barrel parked and head for the archway.', target: state.board.exit, label: 'EXIT' };
  if (!state.level.introduction) return { title: state.level.goal, detail: '' };
  const chapter = introductionById(state.level.introduction);
  const target = state.board.tiles.findIndex((tile, position) => {
    switch (chapter.concept) {
      case 'barrel':
        return state.crates.includes(position);
      case 'switch':
        return isPlate(tile);
      case 'key':
        return isKey(tile) && !state.collectedKeys.includes(position);
      case 'ice':
        return tile === '~';
      case 'crumble':
        return tile === ',';
      case 'bridge':
        return isBridge(tile);
      case 'one-way':
        return !!ONE_WAY[tile];
      case 'lever':
        return tile === 'l';
      case 'tunnel':
        return isTunnel(tile);
      case 'light':
        return isMirror(tile);
    }
  });
  return { ...inspectObject(state, target < 0 ? state.board.exit : target), title: state.level.goal, detail: chapter.explanation };
}
