import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { cx } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';

const accent = CATEGORIES.attention.accent;
const AREA = 320;
const R = 22;

type Status = 'reveal' | 'move' | 'select' | 'result' | 'over';

interface Dot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: boolean;
}

function spread(count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let tries = 0;
  while (pts.length < count && tries < 500) {
    tries++;
    const x = Math.random() * (AREA - 2 * R) + R;
    const y = Math.random() * (AREA - 2 * R) + R;
    if (pts.every((p) => Math.hypot(p.x - x, p.y - y) > R * 2.4)) pts.push({ x, y });
  }
  return pts;
}

function makeDots(round: number): Dot[] {
  const total = Math.min(9, 5 + round);
  const targets = Math.min(total - 2, 2 + Math.floor(round / 2));
  const pts = spread(total);
  const speed = 1.2 + round * 0.25;
  return pts.map((p, i) => {
    const ang = Math.random() * Math.PI * 2;
    return {
      id: i,
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      target: i < targets,
    };
  });
}

export default function SequenceTrack({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<Status>('reveal');
  const [dots, setDots] = useState<Dot[]>(() => makeDots(0));
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const raf = useRef<number>(0);
  const timers = useRef<number[]>([]);
  const dotsRef = useRef(dots);
  useEffect(() => {
    dotsRef.current = dots;
  }, [dots]);
  const targetCount = dots.filter((d) => d.target).length;
  const finished = useRef(false);

  const clearAll = () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearAll(), []);

  const animate = useCallback(() => {
    setDots((prev) =>
      prev.map((d) => {
        let { x, y, vx, vy } = d;
        x += vx;
        y += vy;
        if (x < R || x > AREA - R) { vx = -vx; x = Math.max(R, Math.min(AREA - R, x)); }
        if (y < R || y > AREA - R) { vy = -vy; y = Math.max(R, Math.min(AREA - R, y)); }
        return { ...d, x, y, vx, vy };
      }),
    );
    raf.current = requestAnimationFrame(animate);
  }, []);

  const beginRound = useCallback(
    (r: number) => {
      const nd = makeDots(r);
      setDots(nd);
      setPicked(new Set());
      setStatus('reveal');
      const revealMs = 1400;
      const moveMs = 3200;
      timers.current.push(
        window.setTimeout(() => {
          setStatus('move');
          raf.current = requestAnimationFrame(animate);
        }, revealMs),
      );
      timers.current.push(
        window.setTimeout(() => {
          cancelAnimationFrame(raf.current);
          setStatus('select');
        }, revealMs + moveMs),
      );
    },
    [animate],
  );

  const start = useCallback(() => {
    setCounting(false);
    beginRound(0);
  }, [beginRound]);

  const endGame = useCallback(
    (finalScore: number, reachedRound: number) => {
      if (finished.current) return;
      finished.current = true;
      clearAll();
      timers.current.push(
        window.setTimeout(
          () => onFinish({
            score: finalScore,
            stats: [{ label: 'Round reached', value: String(reachedRound) }],
          }),
          700,
        ),
      );
    },
    [onFinish],
  );

  const pick = (id: number) => {
    if (status !== 'select') return;
    const dot = dotsRef.current.find((d) => d.id === id)!;
    if (picked.has(id)) return;

    if (!dot.target) {
      setPicked((p) => new Set(p).add(id));
      setStatus('over');
      playSound('wrong');
      endGame(score, round + 1);
      return;
    }

    playSound('correct');
    setPicked((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      const correct = [...next].every((i) => dotsRef.current.find((d) => d.id === i)!.target);
      if (correct && next.size === targetCount) {
        const gained = targetCount * 20;
        setScore((s) => s + gained);
        setStatus('result');
        timers.current.push(
          window.setTimeout(() => {
            const nr = round + 1;
            setRound(nr);
            beginRound(nr);
          }, 650),
        );
      }
      return next;
    });
  };

  const statusText =
    status === 'reveal' ? 'Remember the glowing dots' :
    status === 'move' ? 'Track them…' :
    status === 'select' ? 'Tap the ones you tracked' : '\u00A0';

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} status={String(round + 1)} />}>
        <div className="mb-3 h-6 text-center text-sm font-bold" style={{ color: accent }}>
          {statusText}
        </div>
        <div
          className="relative rounded-3xl bg-white/60 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
          style={{ width: 'min(88vw, 320px)', aspectRatio: '1 / 1' }}
        >
          <div className="absolute inset-0" style={{ containerType: 'size' }}>
            {dots.map((d) => {
              const glow = status === 'reveal' && d.target;
              const pickedTarget = picked.has(d.id) && d.target;
              const pickedWrong = picked.has(d.id) && !d.target;
              return (
                <motion.button
                  key={d.id}
                  onClick={() => pick(d.id)}
                  className={cx('ml-tap absolute rounded-full')}
                  style={{
                    width: `${(R * 2 / AREA) * 100}%`,
                    height: `${(R * 2 / AREA) * 100}%`,
                    left: `${((d.x - R) / AREA) * 100}%`,
                    top: `${((d.y - R) / AREA) * 100}%`,
                    background: pickedWrong
                      ? '#ef4444'
                      : glow || pickedTarget
                        ? accent
                        : '#94a3b8',
                    boxShadow: glow ? `0 0 18px ${accent}` : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      </GameStage>
    </div>
  );
}
