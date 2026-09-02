import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { randInt } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { DropPip } from '../components/GameGlyphs';

const accent = CATEGORIES['problem-solving'].accent;
const TOTAL_TIME = 60;
const MAX_MISSES = 3;

interface Drop {
  id: number;
  text: string;
  answer: number;
  x: number; // 0..1 horizontal
  y: number; // 0..1 vertical (0 top, 1 = water line)
  speed: number; // fraction per second
}

function makeProblem(level: number): { text: string; answer: number } {
  const kind = randInt(0, Math.min(3, 1 + Math.floor(level / 4)));
  if (kind === 0) {
    const a = randInt(2, 9 + level);
    const b = randInt(2, 9 + level);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (kind === 1) {
    const a = randInt(5, 12 + level);
    const b = randInt(1, a);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  if (kind === 2) {
    const a = randInt(2, 6 + Math.floor(level / 3));
    const b = randInt(2, 6 + Math.floor(level / 3));
    return { text: `${a} × ${b}`, answer: a * b };
  }
  const b = randInt(2, 9);
  const ans = randInt(2, 9);
  return { text: `${b * ans} ÷ ${b}`, answer: ans };
}

export default function Raindrops({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [entry, setEntry] = useState('');
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const raf = useRef<number>(0);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);
  const lastTs = useRef(0);
  const finished = useRef(false);
  const levelRef = useRef(0);

  const scoreRef = useRef(0);
  const solvedRef = useRef(0);
  const missesRef = useRef(0);
  const entryRef = useRef('');
  const dropsRef = useRef<Drop[]>([]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { solvedRef.current = solved; }, [solved]);
  useEffect(() => { missesRef.current = misses; }, [misses]);
  useEffect(() => { entryRef.current = entry; }, [entry]);
  useEffect(() => { dropsRef.current = drops; }, [drops]);

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
        { label: 'Solved', value: String(solvedRef.current) },
        { label: 'Missed', value: String(missesRef.current) },
      ],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const spawn = useCallback(() => {
    const { text, answer } = makeProblem(levelRef.current);
    setDrops((prev) => [
      ...prev,
      {
        id: nextId.current++,
        text,
        answer,
        x: 0.18 + Math.random() * 0.64,
        y: 0,
        speed: 0.05 + Math.random() * 0.02 + solvedRef.current * 0.0015,
      },
    ]);
  }, []);

  const scheduleSpawn = useCallback(() => {
    if (finished.current) return;
    const delay = Math.max(1100, 2600 - solvedRef.current * 60) + Math.random() * 500;
    timers.current.push(
      window.setTimeout(() => {
        spawn();
        levelRef.current = Math.floor(solvedRef.current / 3);
        scheduleSpawn();
      }, delay),
    );
  }, [spawn]);

  const tick = useCallback((ts: number) => {
    if (finished.current) return;
    const dt = lastTs.current ? (ts - lastTs.current) / 1000 : 0;
    lastTs.current = ts;

    setDrops((prev) => {
      const survivors: Drop[] = [];
      let missedNow = 0;
      for (const d of prev) {
        const y = d.y + d.speed * dt;
        if (y >= 1) {
          missedNow++;
          continue;
        }
        survivors.push({ ...d, y });
      }
      if (missedNow > 0) {
        setMisses((m) => {
          const nm = m + missedNow;
          if (nm >= MAX_MISSES) window.setTimeout(finish, 0);
          return nm;
        });
        setScore((s) => Math.max(0, s - 5 * missedNow));
        setFlash('bad');
        timers.current.push(window.setTimeout(() => setFlash(null), 180));
      }
      return survivors;
    });

    raf.current = requestAnimationFrame(tick);
  }, [finish]);

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
    lastTs.current = 0;
    raf.current = requestAnimationFrame(tick);
    spawn();
    scheduleSpawn();
  }, [timer, tick, spawn, scheduleSpawn]);

  const submit = useCallback(() => {
    if (counting || finished.current) return;
    const val = entryRef.current;
    if (val === '' || val === '-') return;
    const guess = Number(val);
    // Find the LOWEST matching drop (closest to water).
    const matching = dropsRef.current
      .filter((d) => d.answer === guess)
      .sort((a, b) => b.y - a.y)[0];
    if (matching) {
      setDrops((prev) => prev.filter((d) => d.id !== matching.id));
      setSolved((c) => c + 1);
      setScore((s) => s + 25 + Math.round(matching.y * 20));
      setFlash('ok');
      playSound('correct');
    } else {
      setScore((s) => Math.max(0, s - 3));
      setFlash('bad');
      playSound('wrong');
    }
    setEntry('');
    timers.current.push(window.setTimeout(() => setFlash(null), 160));
  }, [counting]);

  const pushDigit = (d: string) => setEntry((e) => (e.length < 4 ? e + d : e));
  const toggleSign = () => setEntry((e) => (e.startsWith('-') ? e.slice(1) : '-' + e));
  const backspace = () => setEntry((e) => e.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') pushDigit(e.key);
      else if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') backspace();
      else if (e.key === '-') toggleSign();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit]);

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
            statusLabel="Lives"
            statusNode={
              <span className="flex items-center gap-1">
                {Array.from({ length: MAX_MISSES }).map((_, i) => (
                  <DropPip
                    key={i}
                    className="h-4 w-4"
                    color={i < MAX_MISSES - misses ? accent : '#cbd5e1'}
                  />
                ))}
              </span>
            }
          />
        }
      >
        <div className="flex w-full flex-col items-center" style={{ maxWidth: 420 }}>
          {/* Sky / falling area */}
          <div
            className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 to-blue-200/60 shadow-inner ring-1 ring-slate-200 dark:from-sky-950/40 dark:to-blue-950/40 dark:ring-white/10"
            style={{ height: 300 }}
          >
            {drops.map((d) => (
              <div
                key={d.id}
                className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-extrabold tabular-nums leading-none text-slate-700 shadow-md ring-1 ring-blue-200 dark:bg-white/15 dark:text-slate-100 dark:ring-white/10"
                style={{ left: `${d.x * 100}%`, top: `${d.y * 92}%` }}
              >
                {d.text}
              </div>
            ))}
            {/* water line */}
            <div className="absolute bottom-0 left-0 h-3 w-full bg-blue-400/70 dark:bg-blue-600/50" />
          </div>

          {/* Entry display */}
          <div
            className="my-3 flex h-12 w-32 items-center justify-center rounded-2xl bg-white/80 text-2xl font-extrabold tabular-nums shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
            style={{
              color: flash === 'ok' ? accent : flash === 'bad' ? '#ef4444' : undefined,
            }}
          >
            {entry || '·'}
          </div>

          {/* Keypad */}
          <div className="grid w-full max-w-[300px] grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <Key key={n} label={n} onTap={() => pushDigit(n)} />
            ))}
            <Key label="±" onTap={toggleSign} />
            <Key label="0" onTap={() => pushDigit('0')} />
            <Key label="⌫" onTap={backspace} />
          </div>
          <button
            onClick={submit}
            className="ml-tap mt-2 w-full max-w-[300px] rounded-2xl py-3 text-lg font-extrabold text-white shadow-lg"
            style={{ background: accent }}
          >
            Solve
          </button>
        </div>
      </GameStage>
    </div>
  );
}

function Key({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onTap}
      className="ml-tap rounded-2xl bg-white/80 py-3 text-xl font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
    >
      {label}
    </motion.button>
  );
}
