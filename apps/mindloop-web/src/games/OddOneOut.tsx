import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { randInt } from '../lib/utils';

const accent = CATEGORIES.attention.accent;
const TOTAL_TIME = 45;

function hsl(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function makeRound(level: number) {
  // Grid grows 2x2 -> up to 6x6; color difference shrinks with level.
  const size = Math.min(6, 2 + Math.floor(level / 2));
  const cells = size * size;
  const odd = randInt(0, cells - 1);
  const hue = randInt(0, 359);
  const sat = randInt(60, 80);
  const light = randInt(45, 70);
  const delta = Math.max(6, 26 - level * 1.6);
  const dir = Math.random() < 0.5 ? -1 : 1;
  return {
    size,
    cells,
    odd,
    base: hsl(hue, sat, light),
    diff: hsl(hue, sat, Math.min(92, Math.max(20, light + dir * delta))),
  };
}

export default function OddOneOut({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(() => makeRound(0));
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const finished = useRef(false);
  const locked = useRef(false);
  useLayoutEffect(() => {
    locked.current = flash !== null;
  }, [flash]);
  const scoreRef = useRef(0);
  const levelRef = useRef(0);
  const nextRound = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(nextRound.current), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [{ label: 'Rounds cleared', value: String(levelRef.current) }],
    });
  }, [onFinish]);

  const { remaining, running, reset, addTime, isExpired } = useCountdown({
    seconds: TOTAL_TIME,
    autoStart: false,
    onExpire: finish,
  });

  const start = useCallback(() => {
    setCounting(false);
    reset(TOTAL_TIME);
  }, [reset]);

  const tap = (idx: number) => {
    if (counting || finished.current || locked.current || !running || isExpired()) return;
    locked.current = true;
    setChosen(idx);
    if (idx === round.odd) {
      const gained = round.size * 10;
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setFlash('ok');
      playSound('correct');
      levelRef.current += 1;
    } else {
      setFlash('bad');
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      addTime(-2);
      playSound('wrong');
    }
    nextRound.current = window.setTimeout(() => {
      if (finished.current) return;
      if (idx === round.odd) {
        setLevel(levelRef.current);
        setRound(makeRound(levelRef.current));
      }
      setFlash(null);
      setChosen(null);
    }, idx === round.odd ? 250 : 650);
  };

  const { size, cells, odd, base, diff } = round;

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} time={remaining} timeFraction={remaining / TOTAL_TIME} status={String(level + 1)} />}>
        <p className="mb-3 text-center text-sm font-bold text-slate-600 dark:text-slate-300">Find the tile with a different shade</p>
        <p role="status" className="mb-4 min-h-6 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
          {flash === 'ok' ? `Found it! +${size * 10} points` : flash === 'bad' ? 'Not that tile. Try again · −5 points, −2s' : `${size} × ${size} grid · one odd tile`}
        </p>
        <motion.div
          animate={flash === 'bad' ? { x: [0, -6, 6, -4, 0] } : {}}
          transition={{ duration: 0.25 }}
          className={`grid ${size === 6 ? 'gap-1 sm:gap-2' : 'gap-2'}`}
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: `min(100%, ${size * 72}px)`,
          }}
        >
          {Array.from({ length: cells }).map((_, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => tap(i)}
              disabled={counting || flash !== null || !running}
              aria-label={`Tile ${i + 1}, row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}`}
              onKeyDown={(event) => {
                if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
                if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -size, ArrowDown: size };
                const offset = offsets[event.key];
                if (offset === undefined) return;
                event.preventDefault();
                const buttons = event.currentTarget.parentElement?.querySelectorAll('button');
                buttons?.[Math.max(0, Math.min(cells - 1, i + offset))]?.focus();
              }}
              className="ml-tap flex min-h-11 aspect-square items-center justify-center rounded-xl shadow-sm"
              style={{ background: i === odd ? diff : base }}
            >
              {chosen === i && <span className="rounded-full bg-white px-2 py-1 text-sm font-black text-slate-900">{flash === 'ok' ? '✓' : '✕'}</span>}
            </motion.button>
          ))}
        </motion.div>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">Keyboard: Tab to a tile, arrow keys to move, Enter to choose</p>
      </GameStage>
    </div>
  );
}
