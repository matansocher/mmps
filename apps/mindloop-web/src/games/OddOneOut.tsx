import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { randInt } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';

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
  const finished = useRef(false);

  const finish = useCallback(
    (finalScore: number, reached: number) => {
      if (finished.current) return;
      finished.current = true;
      onFinish({
        score: finalScore,
        stats: [{ label: 'Rounds cleared', value: String(reached) }],
      });
    },
    [onFinish],
  );

  const timer = useCountdown({
    seconds: TOTAL_TIME,
    autoStart: false,
    onExpire: () => finish(score, level),
  });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  const tap = (idx: number) => {
    if (counting || finished.current) return;
    if (idx === round.odd) {
      const gained = round.size * 10;
      setScore((s) => s + gained);
      setFlash('ok');
      playSound('correct');
      const nl = level + 1;
      setLevel(nl);
      setRound(makeRound(nl));
      window.setTimeout(() => setFlash(null), 200);
    } else {
      setFlash('bad');
      setScore((s) => Math.max(0, s - 5));
      timer.addTime(-2);
      playSound('wrong');
      window.setTimeout(() => setFlash(null), 200);
    }
  };

  const { size, cells, odd, base, diff } = round;

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={
          <HUD
            accent={accent}
            score={score}
            time={timer.remaining}
            timeFraction={timer.remaining / TOTAL_TIME}
            status={String(level + 1)}
          />
        }
      >
        <motion.div
          animate={flash === 'bad' ? { x: [0, -6, 6, -4, 0] } : {}}
          transition={{ duration: 0.25 }}
          className="grid gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: `min(88vw, ${size * 72}px)`,
          }}
        >
          {Array.from({ length: cells }).map((_, i) => (
            <motion.button
              key={`${level}-${i}`}
              whileTap={{ scale: 0.9 }}
              onClick={() => tap(i)}
              className="ml-tap aspect-square rounded-2xl shadow-sm"
              style={{ background: i === odd ? diff : base }}
            />
          ))}
        </motion.div>
      </GameStage>
    </div>
  );
}
