import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { Koi, KoiFed } from '../components/GameGlyphs';

const accent = CATEGORIES.memory.accent;
const TOTAL_TIME = 50;

interface Fish {
  id: number;
  fed: boolean;
  x: number; // 0..1
  y: number; // 0..1
  vx: number;
  vy: number;
}

function spawnFish(id: number): Fish {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.05 + Math.random() * 0.05;
  return {
    id,
    fed: false,
    x: 0.15 + Math.random() * 0.7,
    y: 0.15 + Math.random() * 0.7,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

export default function KoiPond({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [fish, setFish] = useState<Fish[]>([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [fedTotal, setFedTotal] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const raf = useRef<number>(0);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);
  const lastTs = useRef(0);
  const finished = useRef(false);

  const scoreRef = useRef(0);
  const fedRef = useRef(0);
  const mistakesRef = useRef(0);
  const roundRef = useRef(1);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { fedRef.current = fedTotal; }, [fedTotal]);
  useEffect(() => { mistakesRef.current = mistakes; }, [mistakes]);
  useEffect(() => { roundRef.current = round; }, [round]);

  const clearAll = () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearAll(), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    clearAll();
    onFinish({
      score: scoreRef.current,
      stats: [
        { label: 'Fed', value: String(fedRef.current) },
        { label: 'Round', value: String(roundRef.current) },
      ],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const loadRound = useCallback((n: number) => {
    const count = Math.min(9, 2 + n);
    const arr: Fish[] = [];
    for (let i = 0; i < count; i++) arr.push(spawnFish(nextId.current++));
    setFish(arr);
  }, []);

  const tick = useCallback((ts: number) => {
    if (finished.current) return;
    const dt = lastTs.current ? (ts - lastTs.current) / 1000 : 0;
    lastTs.current = ts;
    setFish((prev) =>
      prev.map((f) => {
        let { x, y, vx, vy } = f;
        x += vx * dt;
        y += vy * dt;
        if (x < 0.06) { x = 0.06; vx = Math.abs(vx); }
        if (x > 0.94) { x = 0.94; vx = -Math.abs(vx); }
        if (y < 0.08) { y = 0.08; vy = Math.abs(vy); }
        if (y > 0.92) { y = 0.92; vy = -Math.abs(vy); }
        return { ...f, x, y, vx, vy };
      }),
    );
    raf.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
    lastTs.current = 0;
    loadRound(1);
    raf.current = requestAnimationFrame(tick);
  }, [timer, loadRound, tick]);

  const tapFish = useCallback(
    (id: number) => {
      if (counting || finished.current) return;
      setFish((prev) => {
        const target = prev.find((f) => f.id === id);
        if (!target) return prev;
        if (target.fed) {
          // Re-fed an already-fed fish: mistake, round resets.
          setMistakes((m) => m + 1);
          setScore((s) => Math.max(0, s - 10));
          timer.addTime(-1);
          setFlash('bad');
          playSound('wrong');
          timers.current.push(window.setTimeout(() => setFlash(null), 200));
          // reshuffle same count (fresh unfed) as a soft penalty
          const count = prev.length;
          const fresh: Fish[] = [];
          for (let i = 0; i < count; i++) fresh.push(spawnFish(nextId.current++));
          return fresh;
        }
        // Feed it.
        const updated = prev.map((f) => (f.id === id ? { ...f, fed: true } : f));
        setFedTotal((c) => c + 1);
        setScore((s) => s + 15);
        setFlash('ok');
        playSound('correct');
        timers.current.push(window.setTimeout(() => setFlash(null), 120));
        // Round complete?
        if (updated.every((f) => f.fed)) {
          setScore((s) => s + 30 + roundRef.current * 5);
          const next = roundRef.current + 1;
          setRound(next);
          timers.current.push(window.setTimeout(() => loadRound(next), 500));
        }
        return updated;
      });
    },
    [counting, timer, loadRound],
  );

  const remaining = fish.filter((f) => !f.fed).length;

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
            status={String(round)}
          />
        }
      >
        <p className="mb-3 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
          Feed each koi once — don't feed the same fish twice
        </p>
        <motion.div
          animate={flash === 'bad' ? { x: [0, -6, 6, 0] } : {}}
          transition={{ duration: 0.2 }}
          className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-100 to-teal-200/60 shadow-inner ring-1 ring-slate-200 dark:from-emerald-950/40 dark:to-teal-950/40 dark:ring-white/10"
          style={{ height: 360, maxWidth: 440 }}
        >
          {fish.map((f) => (
            <motion.button
              key={f.id}
              onClick={() => tapFish(f.id)}
              whileTap={{ scale: 0.85 }}
              className="ml-tap absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                left: `${f.x * 100}%`,
                top: `${f.y * 100}%`,
                filter: f.fed ? 'grayscale(1) opacity(0.5)' : 'none',
                background: f.fed ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.55)',
              }}
              aria-label={f.fed ? 'fed koi' : 'hungry koi'}
            >
              {f.fed ? <KoiFed className="h-7 w-7" /> : <Koi className="h-7 w-7" />}
            </motion.button>
          ))}
          <div className="pointer-events-none absolute bottom-2 right-3 rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
            {remaining} left
          </div>
        </motion.div>
      </GameStage>
    </div>
  );
}
