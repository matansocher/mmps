import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { cx, shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { getGridRecallRoundConfig } from './grid-recall-logic';

const accent = CATEGORIES.memory.accent;

type Status = 'ready' | 'showing' | 'input' | 'complete' | 'over';

function makeRound(round: number) {
  const config = getGridRecallRoundConfig(round);
  const { size, lit } = config;
  const cells = size * size;
  const pattern = shuffle([...Array(cells).keys()]).slice(0, lit);
  return { ...config, pattern: new Set(pattern) };
}

export default function GridRecall({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<Status>('ready');
  const [{ size, pattern, revealMs, reward }, setBoard] = useState(() => makeRound(0));
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const statusRef = useRef<Status>('ready');
  const selectedRef = useRef(new Set<number>());
  const started = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const beginRound = useCallback((r: number) => {
    clearTimers();
    const b = makeRound(r);
    setBoard(b);
    selectedRef.current = new Set();
    setSelected(selectedRef.current);
    setWrong(null);
    statusRef.current = 'showing';
    setStatus('showing');
    setRevealed(true);
    timers.current.push(
      window.setTimeout(() => {
        setRevealed(false);
        statusRef.current = 'input';
        setStatus('input');
      }, b.revealMs),
    );
  }, []);

  useEffect(() => () => clearTimers(), []);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setCounting(false);
    beginRound(0);
  }, [beginRound]);

  const handleTap = (idx: number) => {
    if (statusRef.current !== 'input' || selectedRef.current.has(idx)) return;

    if (!pattern.has(idx)) {
      statusRef.current = 'over';
      setWrong(idx);
      setStatus('over');
      setRevealed(true);
      clearTimers();
      playSound('wrong');
      timers.current.push(
        window.setTimeout(() => onFinish({
          score,
          stats: [{ label: 'Round reached', value: String(round + 1) }],
        }), 1200),
      );
      return;
    }

    playSound('correct');
    const next = new Set(selectedRef.current).add(idx);
    selectedRef.current = next;
    setSelected(next);

    if (next.size === pattern.size) {
      statusRef.current = 'complete';
      setScore((s) => s + reward);
      setStatus('complete');
      timers.current.push(
        window.setTimeout(() => {
          const nr = round + 1;
          setRound(nr);
          beginRound(nr);
        }, 700),
      );
    }
  };

  const statusText =
    status === 'showing' ? `Memorize ${pattern.size} tiles` :
    status === 'input' ? `Find the pattern · ${selected.size}/${pattern.size}` :
    status === 'complete' ? `Pattern complete! +${reward}` :
    status === 'over' ? 'Here was the pattern' : 'Get ready';

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={<HUD accent={accent} score={score} status={String(round + 1)} />}
      >
        <div className="mb-3 min-h-6 text-center text-sm font-bold text-slate-700 dark:text-slate-100" role="status">
          {statusText}
        </div>
        <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {size} × {size} grid · {(revealMs / 1000).toFixed(2)}s to memorize · No rush to answer
        </p>
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: `min(100%, ${size * 84}px)`,
          }}
        >
          {Array.from({ length: size * size }).map((_, i) => {
            const isPattern = pattern.has(i);
            const isSel = selected.has(i);
            const isWrong = wrong === i;
            const lit = revealed && isPattern;
            return (
              <button
                key={i}
                onClick={() => handleTap(i)}
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
                aria-label={`Row ${Math.floor(i / size) + 1}, column ${i % size + 1}${isWrong ? ', missed' : isSel ? ', found' : lit ? ', highlighted' : ''}`}
                aria-pressed={isSel}
                aria-disabled={status !== 'input' || isSel}
                className={cx(
                  'ml-tap aspect-square min-h-11 min-w-11 rounded-2xl text-xl font-bold text-white transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-700 dark:focus-visible:outline-white',
                  status === 'input' && !isSel ? 'cursor-pointer' : 'cursor-default',
                  isWrong ? 'bg-red-500' : isSel || lit ? '' : 'bg-white/70 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10',
                )}
                style={isWrong ? undefined : isSel || lit ? { background: accent } : undefined}
              >
                <span aria-hidden="true">{isWrong ? '×' : isSel ? '✓' : lit ? '•' : ''}</span>
              </button>
            );
          })}
        </div>
      </GameStage>
    </div>
  );
}
