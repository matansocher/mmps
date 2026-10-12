import { useId } from 'react';
import type { CSSProperties } from 'react';
import { bridgeIsHorizontal, chapterById, isBridge, isDoor, isKey, isLock, isMirror, isPlate, isTunnel, lightPaths, mirrorShape, ONE_WAY, openDoors } from '../game';
import type { Board, Concept, GameState, Guidance } from '../game';

export const CELL = 64;
export const ROOM_MARGIN = 16;
const COLORS = ['#a5773e', '#79668f', '#4f8580'];
const linkColor = (letter: string) => COLORS[(letter.toLowerCase().charCodeAt(0) - 97) % COLORS.length];

function connection(board: Board, start: number, end: number): readonly number[] {
  const queue = [start];
  const parent = new Map<number, number>([[start, -1]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === end) {
      const path: number[] = [];
      for (let position = end; position !== -1; position = parent.get(position)!) path.unshift(position);
      return path;
    }
    for (const next of [current - board.width, current + board.width, current - 1, current + 1]) {
      if (next < 0 || next >= board.tiles.length || parent.has(next) || board.tiles[next] === '#') continue;
      if (Math.abs(next - current) === 1 && Math.floor(next / board.width) !== Math.floor(current / board.width)) continue;
      parent.set(next, current);
      queue.push(next);
    }
  }
  return [];
}

export function TravelerArt() {
  return (
    <g className="traveler">
      <ellipse cx="32" cy="55" rx="17" ry="6" fill="#24372c" opacity=".25" />
      <path d="M24 46v8m16-8v8" stroke="#35463e" strokeWidth="8" strokeLinecap="round" />
      <rect x="19" y="25" width="26" height="27" rx="10" fill="#3c6870" />
      <rect x="16" y="30" width="9" height="17" rx="4" fill="#b78748" />
      <path d="M24 27l4 23" stroke="#d8b77a" strokeWidth="3" />
      <circle cx="32" cy="20" r="11" fill="#e6c7a0" />
      <path d="M20 18c-2-19 25-19 24 0z" fill="#c29b63" stroke="#785d3c" strokeWidth="1.5" />
      <path d="M18 18q14-5 29 0" stroke="#795e3b" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="22" r="1.5" fill="#35403a" />
      <circle cx="36" cy="22" r="1.5" fill="#35403a" />
      <path d="M44 34q8-5 8 3" fill="none" stroke="#806c43" strokeWidth="2" />
      <rect x="45" y="36" width="10" height="13" rx="2" fill="#edcf80" stroke="#806c43" strokeWidth="2" />
      <path d="M50 39v7" stroke="#fff0b6" strokeWidth="2" />
    </g>
  );
}

export function BarrelArt() {
  return (
    <g className="barrel-art">
      <ellipse cx="33" cy="54" rx="23" ry="7" fill="#30281d" opacity=".25" />
      <path d="M11 19q-4 18 3 31 18 13 36 0 7-17 3-31z" fill="#ad713c" stroke="#694525" strokeWidth="2" />
      <path d="M21 22l1 31m11-30v33m10-34l-1 31" stroke="#805028" strokeWidth="2" />
      <path d="M11 28q21 9 42 0v6q-21 9-42 0zm2 15q20 9 39 0l-2 6q-18 9-36 0z" fill="#55534a" stroke="#3f4139" />
      <path d="M12 28q21 9 40 0m-38 15q19 8 36 0" fill="none" stroke="#acaa8f" strokeWidth="1.5" />
      <ellipse cx="32" cy="18" rx="21" ry="10" fill="#d6a065" stroke="#74502c" strokeWidth="3" />
      <path d="M17 13l28 9m-31-5l25 9m-14-17l24 9" stroke="#ad7943" strokeWidth="1.5" />
      <ellipse cx="34" cy="17" rx="3.5" ry="2.5" fill="#8a5b2f" />
    </g>
  );
}

function KeyArt({ square = false }: { readonly square?: boolean }) {
  const color = square ? '#91a8ad' : '#c79946';
  return (
    <g transform="rotate(-35 32 32)">
      <ellipse cx="34" cy="50" rx="17" ry="5" fill="#334231" opacity=".16" />
      <path d="M32 29v24m0-8h9m-9 7h7" fill="none" stroke="#725f3e" strokeWidth="8" />
      <path d="M32 29v24m0-8h9m-9 7h7" fill="none" stroke={color} strokeWidth="5" />
      {square ? <rect x="22" y="9" width="20" height="20" rx="2" fill="#d2e2df" stroke={color} strokeWidth="6" /> : <circle cx="32" cy="20" r="11" fill="#f7e6b4" stroke={color} strokeWidth="6" />}
    </g>
  );
}

function PlateArt({ pressed = false, label = 'A' }: { readonly pressed?: boolean; readonly label?: string }) {
  return (
    <g className={`scene-switch ${pressed ? 'pressed' : ''}`}>
      <ellipse cx="32" cy="40" rx="24" ry="15" fill="#8a8060" opacity=".35" />
      <ellipse cx="32" cy="33" rx="23" ry="18" fill="#716d51" stroke="#615e48" strokeWidth="2" />
      <ellipse cx="32" cy={pressed ? 34 : 28} rx="20" ry="15" fill={pressed ? '#a9c491' : '#d5b77c'} stroke={linkColor(label)} strokeWidth="3" />
      <ellipse cx="32" cy={pressed ? 34 : 28} rx="14" ry="10" fill="none" stroke={linkColor(label)} />
      <text x="32" y={pressed ? 39 : 33} textAnchor="middle" fill="#484e36" fontSize="15" fontWeight="700">
        {label}
      </text>
    </g>
  );
}

function GateArt({ open, label }: { readonly open: boolean; readonly label: string }) {
  return (
    <g className={`scene-gate ${open ? 'open' : 'closed'}`}>
      <path d="M6 50h52" stroke="#8f8669" strokeWidth="7" />
      <path d="M9 11v40m46-40v40" stroke="#736445" strokeWidth="9" />
      <path d="M9 10h46" stroke="#bca370" strokeWidth="9" />
      <g className="gate-bars" style={{ transform: open ? 'scaleY(0.12)' : 'none' }}>
        <path d="M18 14v34m9-34v34m10-34v34m9-34v34M16 36h33" stroke="#4c554b" strokeWidth="4" strokeLinecap="round" />
        <path d="M17 14v32m9-32v32m10-32v32m9-32v32" stroke="#879079" />
      </g>
      <circle cx="32" cy="9" r="10" fill="#e1cca0" stroke="#8d774d" strokeWidth="2" />
      {label === 'G' ? (
        <g stroke="#8b682f" fill="none">
          <circle cx="32" cy="9" r="4" />
          <path d="M32 2v2m0 10v2M25 9h2m10 0h2M27 4l2 2m6 6l2 2m0-10l-2 2m-6 6l-2 2" />
        </g>
      ) : label === 'H' ? (
        <path d="M35 3a6 6 0 100 12 7 7 0 010-12" fill="#5e6476" />
      ) : label === 'L' ? (
        <path d="M32 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#896f2e" />
      ) : (
        <text x="32" y="13" textAnchor="middle" fontSize="12" fontWeight="700" fill="#454b39">
          {label}
        </text>
      )}
    </g>
  );
}

function BridgeArt({ horizontal = false }: { readonly horizontal?: boolean }) {
  return (
    <g>
      <rect x="1" y="1" width="62" height="62" fill="#749ca0" />
      <path d="M6 11h14m17 43h18M6 47h8m28-29h14" stroke="#b1ccc4" strokeWidth="2" />
      <g className="bridge-planks" style={{ transform: `rotate(${horizontal ? 0 : 90}deg)` }}>
        <rect x="0" y="18" width="64" height="30" rx="3" fill="#70523a" />
        {[4, 15, 26, 37, 48].map((x) => (
          <rect key={x} x={x} y="15" width="10" height="30" rx="1" fill="#bd925d" stroke="#80613b" />
        ))}
        <path d="M0 17h64M0 43h64" stroke="#dfbf84" strokeWidth="3" />
      </g>
      <circle cx="32" cy="31" r="5" fill="#55584d" stroke="#c9b989" strokeWidth="2" />
    </g>
  );
}

function MirrorArt({ slash = true }: { readonly slash?: boolean }) {
  return (
    <g>
      <ellipse cx="32" cy="51" rx="23" ry="8" fill="#526153" opacity=".25" />
      <rect x="12" y="10" width="40" height="43" rx="6" fill="#8e9584" stroke="#5e7062" strokeWidth="2" />
      <g className="mirror-glass" style={{ transform: `rotate(${slash ? 0 : 90}deg)` }}>
        <path d="M15 45L49 14" stroke="#aa803f" strokeWidth="12" strokeLinecap="round" />
        <path d="M15 44L49 13" stroke="#c1e2dc" strokeWidth="7" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="29" r="4" fill="#e7ecce" />
    </g>
  );
}

function LeverArt({ on = false }: { readonly on?: boolean }) {
  return (
    <g>
      <ellipse cx="32" cy="48" rx="21" ry="11" fill="#77725b" />
      <ellipse cx="32" cy="43" rx="19" ry="10" fill="#c3ae77" stroke="#6f684c" strokeWidth="2" />
      <g className="lever-handle" style={{ transform: `rotate(${on ? 56 : 0}deg)` }}>
        <path d="M32 42L18 14" stroke="#52594b" strokeWidth="7" strokeLinecap="round" />
        <circle cx="18" cy="14" r="8" fill={on ? '#b69b54' : '#b9764a'} stroke="#795630" strokeWidth="2" />
      </g>
    </g>
  );
}

function TunnelArt({ label = '0' }: { readonly label?: string }) {
  return (
    <g>
      <path d="M7 57V26a25 25 0 0150 0v31z" fill="#887f91" stroke="#686475" strokeWidth="3" />
      <path d="M15 56V28a17 17 0 0134 0v28z" fill="#3c4650" />
      <path d="M18 53h28m-24-6h20m-16-6h12" stroke="#84999a" strokeWidth="3" />
      <circle cx="32" cy="19" r="10" fill="#d9d1b4" stroke="#5e6174" strokeWidth="2" />
      <text x="32" y="24" textAnchor="middle" fill="#424b52" fontSize="15" fontWeight="700">
        {label}
      </text>
    </g>
  );
}

function IceArt() {
  return (
    <g>
      <rect x="2" y="2" width="60" height="60" rx="3" fill="#a7d0d2" />
      <path d="M3 43L39 3h22v14L20 61H3z" fill="#c8e4df" />
      <path d="M9 9h19M35 56h17M52 25l6-7" stroke="#eff7e6" strokeWidth="3" />
    </g>
  );
}

function CrumbleArt({ gone = false }: { readonly gone?: boolean }) {
  return gone ? (
    <g className="crumble-hole">
      <rect x="1" y="1" width="62" height="62" fill="#586253" />
      <path d="M1 1h62l-7 7H8v48l-7 7z" fill="#88917a" />
      <path d="M20 44l8-3 8 6-12 3z" fill="#707b64" />
    </g>
  ) : (
    <g>
      <rect x="2" y="2" width="60" height="60" fill="#c7b79a" />
      <path d="M4 16l20 6 8-19m-8 19l10 16 27-9M34 38l-5 24m-5-40l-9 26" stroke="#7e785f" strokeWidth="3" fill="none" />
    </g>
  );
}

function ArrowArt({ direction = 'right' }: { readonly direction?: string }) {
  return (
    <g transform={`rotate(${direction === 'up' ? -90 : direction === 'down' ? 90 : direction === 'left' ? 180 : 0} 32 32)`}>
      <rect x="5" y="7" width="54" height="50" rx="5" fill="#aaa787" stroke="#797c61" strokeWidth="2" />
      <path d="M12 32h35m-12-13l14 13-14 13" stroke="#f4efd4" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  );
}

export function ConceptArt({ concept }: { readonly concept: Concept }) {
  return (
    <svg viewBox="-12 -12 88 88" className="concept-art" aria-hidden="true">
      {concept === 'barrel' ? (
        <BarrelArt />
      ) : concept === 'switch' ? (
        <PlateArt />
      ) : concept === 'key' ? (
        <KeyArt />
      ) : concept === 'ice' ? (
        <IceArt />
      ) : concept === 'crumble' ? (
        <CrumbleArt />
      ) : concept === 'bridge' ? (
        <BridgeArt />
      ) : concept === 'one-way' ? (
        <ArrowArt />
      ) : concept === 'lever' ? (
        <LeverArt />
      ) : concept === 'tunnel' ? (
        <TunnelArt />
      ) : (
        <MirrorArt />
      )}
    </svg>
  );
}

export function RoomScene({ state, guidance }: { readonly state: GameState; readonly guidance: Guidance }) {
  const { board } = state;
  const doors = openDoors(state);
  const light = lightPaths(state);
  const id = useId().replace(/:/g, '');
  const translate = (position: number) => `translate(${(position % board.width) * CELL},${Math.floor(position / board.width) * CELL})`;
  const pieceStyle = (position: number): CSSProperties => ({ transform: `translate(${(position % board.width) * CELL}px,${Math.floor(position / board.width) * CELL}px)` });
  const plates = board.tiles.flatMap((tile, position) => (isPlate(tile) ? [position] : []));
  const chapter = chapterById(state.level.chapter);
  return (
    <svg className="room-scene" viewBox={`${-ROOM_MARGIN} ${-ROOM_MARGIN} ${board.width * CELL + ROOM_MARGIN * 2} ${board.height * CELL + ROOM_MARGIN * 2}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-stone`} x2="0" y2="1">
          <stop stopColor="#a8b5a4" />
          <stop offset="1" stopColor={chapter.color} stopOpacity=".55" />
        </linearGradient>
        <linearGradient id={`${id}-exit`} x2="0" y2="1">
          <stop stopColor="#243f35" />
          <stop offset="1" stopColor="#7eb18d" />
        </linearGradient>
      </defs>
      <rect y="8" width={board.width * CELL} height={board.height * CELL} rx="8" fill="#52695b" />
      {board.tiles.map((tile, position) => (
        <g key={position} transform={translate(position)} className={`scene-tile ${tile === '#' ? 'scene-wall' : 'scene-floor'}`} data-position={position}>
          <rect width="64" height="64" fill={tile === '#' ? '#718472' : ['#d3ccb6', '#cec8b2', '#d8d1bc'][position % 3]} />
          {tile !== '#' && (
            <>
              <path d="M1 1h62v62H1z" fill="none" stroke="#b4b49c" />
              <path d={position % 2 ? 'M6 9h9m38 44h5' : 'M7 54l5-2m37-44h8'} stroke="#b5b19b" strokeWidth="1.5" opacity=".6" />
            </>
          )}
          {tile === '~' && <IceArt />}
          {tile === ',' && <CrumbleArt gone={state.collapsed.includes(position)} />}
          {isBridge(tile) && <BridgeArt horizontal={bridgeIsHorizontal(state, position)} />}
        </g>
      ))}
      {plates.flatMap((plate) =>
        board.tiles.flatMap((tile, door) => {
          if (!isDoor(tile) || tile.toLowerCase() !== board.tiles[plate]) return [];
          return [
            <polyline
              key={`${plate}-${door}`}
              points={connection(board, plate, door)
                .map((position) => `${(position % board.width) * CELL + 32},${Math.floor(position / board.width) * CELL + 32}`)
                .join(' ')}
              className={`switch-link ${doors.has(tile) ? 'powered' : ''}`}
              style={{ '--link': linkColor(tile) } as CSSProperties}
            />,
          ];
        }),
      )}
      {light.paths.map((path, index) => (
        <polyline key={index} className="light-beam" points={path.map((position) => `${(position % board.width) * CELL + 32},${Math.floor(position / board.width) * CELL + 32}`).join(' ')} />
      ))}
      {board.tiles.map((tile, position) => (
        <g key={position} transform={translate(position)} data-object={tile} data-position={position}>
          {tile === '#' && (
            <>
              <path d="M1 7h62v54H1z" fill="#647c68" />
              <path d="M1 0h62v52H1z" fill={`url(#${id}-stone)`} stroke="#718672" strokeWidth="1.5" />
              <path d="M4 3h56M4 3v46" fill="none" stroke="#ced2b9" strokeWidth="2" opacity=".6" />
              <path d={position % 3 ? 'M41 2v10l6 4m-44 20h8' : 'M16 2l-3 9m46 30h-8l-4 6'} stroke="#798d79" strokeWidth="1.5" fill="none" opacity=".65" />
            </>
          )}
          {isPlate(tile) && <PlateArt pressed={state.player === position || state.crates.includes(position)} label={tile.toUpperCase()} />}
          {isDoor(tile) && <GateArt open={doors.has(tile)} label={tile} />}
          {(tile === 'G' || tile === 'H' || tile === 'L') && <GateArt label={tile} open={tile === 'G' ? state.leverOn : tile === 'H' ? !state.leverOn : light.powered} />}
          {isKey(tile) && !state.collectedKeys.includes(position) && <KeyArt square={tile === 'j'} />}
          {isLock(tile) && (
            <g className={`scene-lock ${state.unlockedLocks.includes(position) ? 'unlocked' : ''}`}>
              <path d="M8 55V20a24 20 0 0148 0v35" fill="none" stroke="#8c8870" strokeWidth="8" />
              {!state.unlockedLocks.includes(position) && (
                <>
                  <path d="M13 55V22a19 17 0 0138 0v33z" fill={tile === 'J' ? '#879597' : '#ad8450'} stroke="#715c3e" strokeWidth="2" />
                  <path d="M21 14v39m11-46v46m11-39v39" stroke="#715c3e" strokeWidth="2" />
                  {tile === 'J' ? (
                    <rect x="25" y="21" width="14" height="14" fill="#d4e3dc" stroke="#4f6269" strokeWidth="3" />
                  ) : (
                    <circle cx="32" cy="28" r="8" fill="#ead494" stroke="#6e572e" strokeWidth="3" />
                  )}
                  <path d="M32 26v10" stroke="#4a4b3c" strokeWidth="3" />
                </>
              )}
            </g>
          )}
          {ONE_WAY[tile] && <ArrowArt direction={ONE_WAY[tile]} />}
          {tile === 'l' && <LeverArt on={state.leverOn} />}
          {isTunnel(tile) && <TunnelArt label={tile} />}
          {isMirror(tile) && <MirrorArt slash={mirrorShape(state, position) === '/'} />}
          {tile === '*' && (
            <g>
              <path d="M12 50h34l-3-9H15z" fill="#827b5b" />
              <circle cx="29" cy="29" r="19" fill="#b59a54" stroke="#75613f" strokeWidth="3" />
              <path d="M29 29h25" stroke="#f6e4a5" strokeWidth="9" />
              <circle cx="29" cy="29" r="9" fill="#f5e8b9" />
            </g>
          )}
          {tile === 'o' && (
            <g className={`receiver ${light.lit.has(position) ? 'lit' : ''}`}>
              <circle cx="32" cy="32" r="23" fill="#79785a" />
              <circle cx="32" cy="30" r="18" fill={light.lit.has(position) ? '#f2db8b' : '#b3b49a'} stroke="#8c7546" strokeWidth="4" />
              <path d="M32 17v26m-13-13h26" stroke="#806e40" strokeWidth="2" />
            </g>
          )}
          {tile === 'E' && (
            <g className="scene-exit">
              <path d="M10 55V26a22 22 0 0144 0v29z" fill={`url(#${id}-exit)`} stroke="#dfe0c6" strokeWidth="7" />
              <path d="M17 54h30m-28-7h26m-23-7h20" stroke="#aed1a6" strokeWidth="4" />
              <path d="M32 35V18m-6 6l6-6 6 6" stroke="#e5f2cc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          )}
        </g>
      ))}
      {guidance.target !== undefined && <rect transform={translate(guidance.target)} x="3" y="3" width="58" height="58" rx="7" fill="none" stroke="#fff2bf" strokeWidth="3" strokeDasharray="6 4" />}
      {state.crates.map((position, index) => (
        <g key={index} className={`scene-piece ${state.events.includes('tunnel') ? 'tunnel-arrival' : ''}`} style={pieceStyle(position)} data-kind="barrel" data-position={position}>
          <BarrelArt />
        </g>
      ))}
      <g
        className={`scene-piece scene-player ${state.won ? 'arrived' : ''} ${state.events.includes('tunnel') ? 'tunnel-arrival' : ''}`}
        style={pieceStyle(state.player)}
        data-kind="player"
        data-position={state.player}
      >
        <TravelerArt />
      </g>
    </svg>
  );
}
