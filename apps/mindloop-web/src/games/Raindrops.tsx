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
import { advanceDrops, findLowestMatch, getDropReward } from './raindrops-logic';
import type { Drop } from './raindrops-logic';

const accent = CATEGORIES['problem-solving'].accent;
const TOTAL_TIME = 60;
const MAX_MISSES = 3;

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
  const [feedback, setFeedback] = useState('Solve a drop before it reaches the water.');

  const raf = useRef<number>(0);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);
  const lastTs = useRef(0);
  const finished = useRef(false);
  const levelRef = useRef(0);
  const feedbackTimer = useRef<number>(0);
  const started = useRef(false);

  const scoreRef = useRef(0);
  const solvedRef = useRef(0);
  const missesRef = useRef(0);
  const entryRef = useRef('');
  const dropsRef = useRef<Drop[]>([]);

  const clearAll = () => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(feedbackTimer.current);
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
  const { isExpired } = timer;

  const showFeedback = useCallback((kind: 'ok' | 'bad', message: string) => {
    window.clearTimeout(feedbackTimer.current);
    setFlash(kind);
    setFeedback(message);
    feedbackTimer.current = window.setTimeout(() => setFlash(null), 700);
  }, []);

  const spawn = useCallback(() => {
    if (finished.current) return;
    levelRef.current = Math.min(20, Math.floor(solvedRef.current / 3));
    const { text, answer } = makeProblem(levelRef.current);
    const id = nextId.current++;
    dropsRef.current = [
      ...dropsRef.current,
      {
        id,
        text,
        answer,
        x: [0.18, 0.5, 0.82][id % 3],
        y: 0,
        speed: 0.05 + Math.random() * 0.02 + solvedRef.current * 0.0015,
        level: levelRef.current,
      },
    ];
    setDrops(dropsRef.current);
  }, []);

  const scheduleSpawn = useCallback(function scheduleNext() {
    if (finished.current) return;
    const delay = Math.max(1100, 2600 - solvedRef.current * 60) + Math.random() * 500;
    timers.current.push(
      window.setTimeout(() => {
        spawn();
        scheduleNext();
      }, delay),
    );
  }, [spawn]);

  const tick = useCallback(function animate(ts: number) {
    if (finished.current) return;
    if (isExpired()) {
      finish();
      return;
    }
    const dt = lastTs.current ? (ts - lastTs.current) / 1000 : 0;
    lastTs.current = ts;

    const next = advanceDrops(dropsRef.current, dt);
    dropsRef.current = next.drops;
    setDrops(next.drops);
    if (next.missed > 0) {
      missesRef.current = Math.min(MAX_MISSES, missesRef.current + next.missed);
      scoreRef.current = Math.max(0, scoreRef.current - 5 * next.missed);
      setMisses(missesRef.current);
      setScore(scoreRef.current);
      showFeedback('bad', `${next.missed === 1 ? 'A drop landed' : `${next.missed} drops landed`}. ${MAX_MISSES - missesRef.current} lives left.`);
      playSound('wrong');
      if (missesRef.current >= MAX_MISSES) {
        finish();
        return;
      }
    }

    raf.current = requestAnimationFrame(animate);
  }, [finish, showFeedback, isExpired]);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setCounting(false);
    timer.reset(TOTAL_TIME);
    lastTs.current = 0;
    raf.current = requestAnimationFrame(tick);
    spawn();
    scheduleSpawn();
  }, [timer, tick, spawn, scheduleSpawn]);

  const submit = useCallback(() => {
    if (counting || finished.current || isExpired()) return;
    const val = entryRef.current;
    if (val === '' || val === '-') return;
    const guess = Number(val);
    // Find the LOWEST matching drop (closest to water).
    const matching = findLowestMatch(dropsRef.current, guess);
    if (matching) {
      dropsRef.current = dropsRef.current.filter((d) => d.id !== matching.id);
      setDrops(dropsRef.current);
      solvedRef.current += 1;
      setSolved(solvedRef.current);
      const gained = getDropReward(matching);
      scoreRef.current += gained;
      showFeedback('ok', `${matching.text} = ${guess} · +${gained}`);
      playSound('correct');
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 3);
      showFeedback('bad', 'No matching drop. Try another answer.');
      playSound('wrong');
    }
    setScore(scoreRef.current);
    entryRef.current = '';
    setEntry('');
  }, [counting, isExpired, showFeedback]);

  const editEntry = useCallback((edit: (value: string) => string) => {
    if (!started.current || finished.current || isExpired()) return;
    entryRef.current = edit(entryRef.current);
    setEntry(entryRef.current);
  }, [isExpired]);
  const pushDigit = (d: string) => editEntry((e) => (e.length < 4 ? e + d : e));
  const backspace = () => editEntry((e) => e.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= '0' && e.key <= '9') editEntry((value) => value.length < 4 ? value + e.key : value);
      else if (e.key === 'Enter') {
        if (e.target instanceof HTMLButtonElement) return;
        submit();
      } else if (e.key === 'Backspace') editEntry((value) => value.slice(0, -1));
      else if (e.key === 'Delete') editEntry(() => '');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, editEntry]);

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
              <span aria-label={`${MAX_MISSES - misses} lives remaining`} className="flex items-center gap-1">
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
          <p className="mb-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
            Level {Math.min(20, Math.floor(solved / 3)) + 1} · {solved >= 60 ? 'Expert pace' : `${3 - solved % 3} solves to level up`}
          </p>
          {/* Sky / falling area */}
          <div
            className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 to-blue-200/60 shadow-inner ring-1 ring-slate-200 dark:from-sky-950/40 dark:to-blue-950/40 dark:ring-white/10"
            style={{ height: 'clamp(200px, 32dvh, 300px)' }}
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

          <p role="status" className="mt-2 min-h-10 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{feedback}</p>

          <div
            role="status"
            aria-label={`Answer: ${entry || 'empty'}`}
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
            <Key label="C" ariaLabel="Clear answer" onTap={() => editEntry(() => '')} />
            <Key label="0" onTap={() => pushDigit('0')} />
            <Key label="⌫" ariaLabel="Backspace" onTap={backspace} />
          </div>
          <button
            onClick={submit}
            disabled={counting || entry === ''}
            className="ml-tap mt-2 w-full max-w-[300px] rounded-2xl py-3 text-lg font-extrabold text-white shadow-lg disabled:opacity-50"
            style={{ background: accent }}
          >
            Solve
          </button>
        </div>
      </GameStage>
    </div>
  );
}

function Key({ label, ariaLabel, onTap }: { readonly label: string; readonly ariaLabel?: string; readonly onTap: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onTap}
      aria-label={ariaLabel ?? label}
      className="ml-tap rounded-2xl bg-white/80 py-3 text-xl font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
    >
      {label}
    </motion.button>
  );
}
