import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { cx, shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';

const accent = CATEGORIES.memory.accent;

type Status = 'ready' | 'showing' | 'input' | 'over';

function makeRound(round: number) {
  // Grid grows every two rounds: 3x3 -> 4x4 -> 5x5 (cap).
  const size = Math.min(5, 3 + Math.floor(round / 2));
  const cells = size * size;
  const lit = Math.min(cells - 1, 3 + round);
  const pattern = shuffle([...Array(cells).keys()]).slice(0, lit);
  return { size, pattern: new Set(pattern) };
}

export default function GridRecall({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<Status>('ready');
  const [{ size, pattern }, setBoard] = useState(() => makeRound(0));
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const beginRound = useCallback((r: number) => {
    const b = makeRound(r);
    setBoard(b);
    setSelected(new Set());
    setWrong(null);
    setStatus('showing');
    setRevealed(true);
    const showMs = 900 + b.pattern.size * 220;
    timers.current.push(
      window.setTimeout(() => {
        setRevealed(false);
        setStatus('input');
      }, showMs),
    );
  }, []);

  useEffect(() => () => clearTimers(), []);

  const start = useCallback(() => {
    setCounting(false);
    beginRound(0);
  }, [beginRound]);

  const handleTap = (idx: number) => {
    if (status !== 'input') return;
    if (selected.has(idx)) return;

    if (!pattern.has(idx)) {
      setWrong(idx);
      setStatus('over');
      clearTimers();
      playSound('wrong');
      timers.current.push(
        window.setTimeout(() => onFinish({
          score,
          stats: [{ label: 'Round reached', value: String(round + 1) }],
        }), 800),
      );
      return;
    }

    playSound('correct');
    setSelected((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);

      if (next.size === pattern.size) {
        const gained = pattern.size * 10;
        setScore((s) => s + gained);
        setStatus('showing');
        timers.current.push(
          window.setTimeout(() => {
            const nr = round + 1;
            setRound(nr);
            beginRound(nr);
          }, 550),
        );
      }
      return next;
    });
  };

  const statusText =
    status === 'showing' && revealed ? 'Memorize!' : status === 'input' ? 'Your turn' : '\u00A0';

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={<HUD accent={accent} score={score} status={String(round + 1)} />}
      >
        <div className="mb-3 h-6 text-sm font-bold" style={{ color: accent }}>
          {statusText}
        </div>
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: `min(88vw, ${size * 84}px)`,
          }}
        >
          {Array.from({ length: size * size }).map((_, i) => {
            const isPattern = pattern.has(i);
            const isSel = selected.has(i);
            const isWrong = wrong === i;
            const lit = revealed && isPattern;
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTap(i)}
                className={cx(
                  'ml-tap aspect-square rounded-2xl transition-colors duration-150',
                  isWrong ? 'bg-red-500' : isSel || lit ? '' : 'bg-white/70 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10',
                )}
                style={isWrong ? undefined : isSel || lit ? { background: accent } : undefined}
              />
            );
          })}
        </div>
      </GameStage>
    </div>
  );
}
