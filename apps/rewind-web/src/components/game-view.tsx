import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { availableInteractions } from '../game';
import type { Direction, GameState, Guidance } from '../game';
import { CELL, ROOM_MARGIN, RoomScene } from './room-scene';

export const ARROWS: Readonly<Record<Direction, string>> = { up: '↑', down: '↓', left: '←', right: '→' };
export function Stars({ count }: { readonly count: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((star) => (
        <span key={star} aria-hidden="true" className={star < count ? 'earned' : ''}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Board({
  state,
  guidance,
  onMove,
  onInspect,
}: {
  readonly state: GameState;
  readonly guidance: Guidance;
  readonly onMove: (move: Direction) => void;
  readonly onInspect: (position: number) => void;
}) {
  const pointer = useRef<{ readonly x: number; readonly y: number; readonly id: number } | null>(null);
  const { board } = state;
  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || state.won) return;
    pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 24) {
      onMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((((event.clientX - bounds.left) / bounds.width) * (board.width * CELL + ROOM_MARGIN * 2) - ROOM_MARGIN) / CELL);
    const y = Math.floor((((event.clientY - bounds.top) / bounds.height) * (board.height * CELL + ROOM_MARGIN * 2) - ROOM_MARGIN) / CELL);
    if (x < 0 || y < 0 || x >= board.width || y >= board.height) return;
    const position = y * board.width + x;
    const deltaX = x - (state.player % board.width);
    const deltaY = y - Math.floor(state.player / board.width);
    if (Math.abs(deltaX) + Math.abs(deltaY) === 1 && !availableInteractions(state).includes(position)) onMove(deltaX ? (deltaX > 0 ? 'right' : 'left') : deltaY > 0 ? 'down' : 'up');
    else onInspect(position);
  }
  return (
    <div className="board-stage" style={{ '--columns': board.width + 0.5, '--rows': board.height + 0.5 } as CSSProperties}>
      <div className="board-frame">
        <div
          className="board"
          role="img"
          aria-label={`Room ${state.level.id}. Traveler at row ${Math.floor(state.player / board.width) + 1}, column ${(state.player % board.width) + 1}. Exit at row ${Math.floor(board.exit / board.width) + 1}, column ${(board.exit % board.width) + 1}. ${state.crates.length} barrels. Swipe or use the direction buttons to walk.`}
          onPointerDown={startSwipe}
          onPointerUp={endSwipe}
          onPointerCancel={() => {
            pointer.current = null;
          }}
          onLostPointerCapture={() => {
            pointer.current = null;
          }}
        >
          <RoomScene state={state} guidance={guidance} />
          {guidance.target !== undefined && guidance.label && (
            <span
              className="board-label"
              style={{
                left: `clamp(82px, ${(((guidance.target % board.width) + 0.75) / (board.width + 0.5)) * 100}%, calc(100% - 82px))`,
                top: `${Math.max(0, ((Math.floor(guidance.target / board.width) - 0.1) / (board.height + 0.5)) * 100)}%`,
              }}
            >
              {guidance.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="sheet"
      ref={ref}
      aria-labelledby="sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet-content">
        <header className="sheet-heading">
          <h2 id="sheet-title">{title}</h2>
          <button className="icon-button" aria-label="Close panel" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
