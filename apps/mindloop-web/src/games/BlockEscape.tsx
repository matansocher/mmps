import { MotionConfig, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import {
  advanceEscapeSession,
  createEscapePuzzle,
  createEscapeSession,
  ESCAPE_SECONDS,
  ESCAPE_SIZE,
  ESCAPE_TARGET,
  escapeDragOffset,
  escapeDragRange,
  escapeScore,
  escapeTimeRemaining,
  isEscapeSolved,
  moveEscapeBlock,
  moveEscapeSession,
  undoEscapeSession,
} from './block-escape';
import type { EscapeBlock, EscapeSession } from './block-escape';

const ACCENT = CATEGORIES['problem-solving'].accent;
const TITLES = ['Make a little room', 'Think ahead', 'Untangle the traffic', 'Plan your escape', 'Master the grid'];
const CONTROL = 'ml-tap min-h-12 rounded-xl px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40';
type Drag = {
  readonly id: string;
  readonly pointerId: number;
  readonly start: number;
  readonly horizontal: boolean;
  readonly cellSize: number;
  readonly min: number;
  readonly max: number;
};
type DragPreview = { readonly id: string; readonly offset: number };

export function BlockEscape({ onFinish }: GameProps) {
  const [run, setRun] = useState(() => createEscapeSession(createEscapePuzzle(0)));
  const runRef = useRef(run);
  const [selected, setSelected] = useState(ESCAPE_TARGET);
  const [counting, setCounting] = useState(true);
  const [remaining, setRemaining] = useState(ESCAPE_SECONDS);
  const [notice, setNotice] = useState('Drag the blocks to make an opening.');
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const deadline = useRef<number | null>(null);
  const finished = useRef(false);
  const boardElement = useRef<HTMLDivElement>(null);
  const friendButton = useRef<HTMLButtonElement>(null);
  const { reducedMotion } = useTheme();
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = reducedMotion || systemReducedMotion;
  const won = isEscapeSolved(run.state.board);
  const piece = run.state.board.find((block) => block.id === selected)!;
  const horizontal = piece.axis === 'horizontal';
  const name = selected === ESCAPE_TARGET ? 'Friend' : `Block ${selected}`;

  const commit = useCallback((next: EscapeSession) => {
    runRef.current = next;
    setRun(next);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    drag.current = null;
    const result = runRef.current;
    onFinish({
      score: result.score,
      stats: [
        { label: 'Friends freed', value: String(result.solved) },
        { label: 'Moves', value: String(result.moves) },
        { label: 'Undos', value: String(result.undos) },
        { label: 'Run length', value: '60 seconds' },
      ],
    });
  }, [onFinish]);

  const canPlay = useCallback(() => {
    if (deadline.current === null || finished.current) return false;
    if (escapeTimeRemaining(deadline.current, Date.now()) === 0) {
      finish();
      return false;
    }
    return true;
  }, [finish]);

  const start = useCallback(() => {
    if (deadline.current !== null) return;
    deadline.current = Date.now() + ESCAPE_SECONDS * 1000;
    setCounting(false);
  }, []);

  useEffect(() => {
    if (counting) return;
    const tick = () => {
      const time = escapeTimeRemaining(deadline.current!, Date.now());
      setRemaining(time);
      if (time === 0) finish();
    };
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [counting, finish]);

  useEffect(() => {
    if (!counting) friendButton.current?.focus({ preventScroll: true });
  }, [counting, run.puzzle]);

  useEffect(() => {
    if (!won) return;
    const timer = window.setTimeout(() => {
      if (!canPlay()) return;
      const current = runRef.current;
      const next = createEscapePuzzle(current.solved, current.puzzle.board);
      commit(advanceEscapeSession(current, next));
      setSelected(ESCAPE_TARGET);
      setNotice('New board. Keep the escapes coming!');
    }, 350);
    return () => window.clearTimeout(timer);
  }, [won, run.solved, canPlay, commit]);

  const move = (id: string, delta: number) => {
    if (!canPlay() || drag.current) return;
    const next = moveEscapeSession(runRef.current, { id, delta });
    if (next === runRef.current) {
      setNotice('That direction is blocked. Try moving another block first.');
      return;
    }
    commit(next);
    if (isEscapeSolved(next.state.board)) {
      setNotice(`Friend freed! +${escapeScore(next.state, next.puzzle.optimalMoves)} points.`);
      playSound('correct');
    } else {
      setNotice(`${id === ESCAPE_TARGET ? 'Friend' : `Block ${id}`} moved ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'square' : 'squares'}.`);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.key.startsWith('Arrow') || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (event.repeat || drag.current || !canPlay() || won) return;
    const arrows: Record<string, number> = horizontal ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
    if (arrows[event.key]) move(selected, arrows[event.key]);
    else setNotice(`${name} only moves ${horizontal ? 'left or right' : 'up or down'}.`);
  };

  const beginDrag = (event: PointerEvent<HTMLButtonElement>, block: EscapeBlock) => {
    if (!event.isPrimary || event.button !== 0 || drag.current || !canPlay() || won) return;
    const range = escapeDragRange(runRef.current.state.board, block.id);
    const horizontal = block.axis === 'horizontal';
    drag.current = {
      id: block.id,
      pointerId: event.pointerId,
      start: horizontal ? event.clientX : event.clientY,
      horizontal,
      cellSize: boardElement.current!.clientWidth / ESCAPE_SIZE,
      ...range,
    };
    dragged.current = false;
    setSelected(block.id);
    setPreview({ id: block.id, offset: 0 });
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId || !canPlay()) return;
    const distance = (active.horizontal ? event.clientX : event.clientY) - active.start;
    if (Math.abs(distance) >= 6) dragged.current = true;
    setPreview({ id: active.id, offset: dragged.current ? escapeDragOffset(distance, active.cellSize, active) : 0 });
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    drag.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled || !canPlay()) return;
    const distance = (active.horizontal ? event.clientX : event.clientY) - active.start;
    const delta = Math.round(escapeDragOffset(distance, active.cellSize, active) / active.cellSize);
    if (Math.abs(distance) >= 6) dragged.current = true;
    if (delta !== 0) move(active.id, delta);
  };

  const undo = () => {
    if (!canPlay() || drag.current || won) return;
    commit(undoEscapeSession(runRef.current));
    setNotice('Last slide undone. Its squares still count toward your score.');
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div className="relative flex flex-1 flex-col">
        {counting && <CountdownOverlay accent={ACCENT} onDone={start} />}
        <GameStage hud={<HUD accent={ACCENT} score={run.score} time={remaining} timeFraction={remaining / ESCAPE_SECONDS} status={String(run.solved)} statusLabel="Freed" />}>
          <div className="w-full max-w-sm space-y-4" onKeyDown={onKeyDown}>
            <div className="text-center">
              <h2 className="text-lg font-bold">{TITLES[Math.min(4, run.solved)]}</h2>
              <p id="escape-instructions" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Drag blocks to free your friend through the gate.
                <br />
                Solve as many boards as you can in one minute.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span className="tabular-nums">
                <strong className="text-slate-800 dark:text-white">{run.state.moves}</strong> moves
              </span>
              <span>Best route: {run.puzzle.optimalMoves} moves</span>
            </div>
            <div className="relative pr-6">
              <div
                ref={boardElement}
                role="group"
                aria-label="Escape board, five rows by five columns"
                aria-describedby="escape-instructions"
                className="relative aspect-square w-full rounded-2xl border-2 border-slate-300 bg-slate-200/60 dark:border-slate-600 dark:bg-slate-800"
              >
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 p-0.5" aria-hidden="true">
                  {Array.from({ length: ESCAPE_SIZE * ESCAPE_SIZE }, (_, index) => (
                    <span key={index} className="m-0.5 rounded-lg bg-white/45 dark:bg-white/5" />
                  ))}
                </div>
                <div className="absolute -right-1 top-[40%] h-[20%] w-2 bg-emerald-100 dark:bg-emerald-950" aria-hidden="true" />
                {run.state.board.map((block) => {
                  const target = block.id === ESCAPE_TARGET;
                  const active = selected === block.id;
                  const offset = preview?.id === block.id ? preview.offset : 0;
                  return (
                    <button
                      key={block.id}
                      ref={target ? friendButton : undefined}
                      type="button"
                      disabled={counting || won}
                      aria-pressed={active}
                      aria-label={`${target ? 'Friend' : `Block ${block.id}`}, ${block.axis}, row ${block.row + 1}, column ${block.column + 1}`}
                      onPointerDown={(event) => beginDrag(event, block)}
                      onPointerMove={updateDrag}
                      onPointerUp={(event) => endDrag(event)}
                      onPointerCancel={(event) => endDrag(event, true)}
                      onLostPointerCapture={(event) => endDrag(event, true)}
                      onClick={(event) => {
                        if (event.detail > 0 && dragged.current) return;
                        setSelected(block.id);
                        setNotice(`${target ? 'Friend' : `Block ${block.id}`} selected. Drag or use the arrows.`);
                      }}
                      onFocus={() => setSelected(block.id)}
                      className={`ml-tap absolute flex items-center justify-center gap-1 rounded-xl border-2 font-bold shadow-sm focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-300 ${
                        target
                          ? 'border-emerald-700 bg-emerald-200 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-800 dark:text-emerald-50'
                          : 'border-slate-400 bg-white text-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100'
                      } ${active ? 'ring-2 ring-emerald-700 ring-offset-1 dark:ring-emerald-300 dark:ring-offset-slate-800' : ''}`}
                      style={{
                        left: `calc(${block.column * 20}% + 2px)`,
                        top: `calc(${block.row * 20}% + 2px)`,
                        width: `calc(${(block.axis === 'horizontal' ? block.length : 1) * 20}% - 4px)`,
                        height: `calc(${(block.axis === 'vertical' ? block.length : 1) * 20}% - 4px)`,
                        flexDirection: block.axis === 'vertical' ? 'column' : 'row',
                        transform: `translate(${block.axis === 'horizontal' ? offset : 0}px, ${block.axis === 'vertical' ? offset : 0}px)`,
                        touchAction: 'none',
                        cursor: preview?.id === block.id ? 'grabbing' : 'grab',
                        zIndex: preview?.id === block.id ? 10 : undefined,
                      }}
                    >
                      {target ? (
                        <svg viewBox="0 0 32 32" className="pointer-events-none h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <circle cx="16" cy="16" r="12" />
                          <path d="M11 12v2m10-2v2m-10 5q5 6 10 0" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <span aria-hidden="true">{block.id}</span>
                      )}
                      <span className="text-sm" aria-hidden="true">
                        {block.axis === 'horizontal' ? '↔' : '↕'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="absolute right-0 top-[43%] text-xl font-bold text-emerald-800 dark:text-emerald-300" aria-label="Exit to the right">
                →
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-center text-sm font-semibold">{won ? 'Free at last! Next board coming...' : `${name} selected · ${horizontal ? 'horizontal' : 'vertical'}`}</p>
              <div className="grid grid-cols-3 gap-2">
                {[-1, 1].map((delta) => (
                  <button
                    key={`${selected}-${delta}`}
                    type="button"
                    disabled={counting || won || preview !== null || !moveEscapeBlock(run.state.board, { id: selected, delta })}
                    onClick={() => move(selected, delta)}
                    className={`${CONTROL} bg-emerald-700 text-white enabled:hover:bg-emerald-800 dark:bg-emerald-300 dark:text-emerald-950 dark:enabled:hover:bg-emerald-200`}
                  >
                    {horizontal ? (delta < 0 ? '← Left' : 'Right →') : delta < 0 ? '↑ Up' : 'Down ↓'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={undo}
                  disabled={counting || won || preview !== null || !run.state.history.length}
                  className={`${CONTROL} bg-slate-200 text-slate-800 enabled:hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:enabled:hover:bg-slate-600`}
                >
                  Undo
                </button>
              </div>
            </div>
            <p role="status" aria-live="polite" className="min-h-10 text-center text-sm text-slate-600 dark:text-slate-300">
              {notice}
            </p>
            <p className="text-center text-xs text-slate-600 dark:text-slate-400">
              Drag with a finger or mouse, or select a block and use arrow keys.
              <br />
              Each square counts as a move. Undo does not erase spent moves.
            </p>
          </div>
        </GameStage>
      </div>
    </MotionConfig>
  );
}
