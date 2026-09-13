import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { getTrackingRoundConfig, makeTrackingDots, stepTrackingDots, TRACK_AREA, TRACK_RADIUS } from './sequence-track-logic';

const accent = CATEGORIES.attention.accent;
const STEP_MS = 1000 / 60;

type Status = 'reveal' | 'move' | 'select' | 'result' | 'over';

export default function SequenceTrack({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<Status>('reveal');
  const [dots, setDots] = useState(() => makeTrackingDots(0));
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const raf = useRef<number>(0);
  const timers = useRef<number[]>([]);
  const dotsRef = useRef(dots);
  const statusRef = useRef<Status>('reveal');
  const pickedRef = useRef(new Set<number>());
  const lastFrame = useRef<number | null>(null);
  const accumulatedMs = useRef(0);
  const targetCount = dots.filter((d) => d.target).length;
  const finished = useRef(false);
  const started = useRef(false);
  const config = getTrackingRoundConfig(round);

  const clearAll = () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearAll(), []);

  const animate = useCallback(function animateDots(timestamp: number) {
    if (statusRef.current !== 'move') return;
    if (lastFrame.current !== null) {
      accumulatedMs.current += Math.min(100, timestamp - lastFrame.current);
      while (accumulatedMs.current >= STEP_MS) {
        dotsRef.current = stepTrackingDots(dotsRef.current, STEP_MS / 1000);
        accumulatedMs.current -= STEP_MS;
      }
      setDots(dotsRef.current);
    }
    lastFrame.current = timestamp;
    raf.current = requestAnimationFrame(animateDots);
  }, []);

  const beginRound = useCallback(
    (r: number) => {
      clearAll();
      const nd = makeTrackingDots(r);
      dotsRef.current = nd;
      setDots(nd);
      pickedRef.current = new Set();
      setPicked(pickedRef.current);
      statusRef.current = 'reveal';
      setStatus('reveal');
      lastFrame.current = null;
      accumulatedMs.current = 0;
      const { revealMs, moveMs } = getTrackingRoundConfig(r);
      timers.current.push(
        window.setTimeout(() => {
          statusRef.current = 'move';
          setStatus('move');
          raf.current = requestAnimationFrame(animate);
        }, revealMs),
      );
      timers.current.push(
        window.setTimeout(() => {
          cancelAnimationFrame(raf.current);
          statusRef.current = 'select';
          setStatus('select');
        }, revealMs + moveMs),
      );
    },
    [animate],
  );

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
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
          1200,
        ),
      );
    },
    [onFinish],
  );

  const pick = (id: number) => {
    if (statusRef.current !== 'select' || finished.current) return;
    const dot = dotsRef.current.find((d) => d.id === id)!;
    if (pickedRef.current.has(id)) return;
    const next = new Set(pickedRef.current).add(id);
    pickedRef.current = next;
    setPicked(next);

    if (!dot.target) {
      statusRef.current = 'over';
      setStatus('over');
      playSound('wrong');
      endGame(score, round + 1);
      return;
    }

    playSound('correct');
    if (next.size === targetCount) {
      statusRef.current = 'result';
      setScore((s) => s + config.reward);
      setStatus('result');
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
    status === 'reveal' ? `Remember ${targetCount} marked dots` :
    status === 'move' ? 'Track them…' :
    status === 'select' ? `Find your dots · ${picked.size}/${targetCount}` :
    status === 'result' ? `All tracked! +${config.reward}` : 'Here were your dots';
  const selectionOrder = [...dots].sort((a, b) => a.y - b.y || a.x - b.x).map((dot) => dot.id);

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} status={String(round + 1)} />}>
        <div className="mb-3 min-h-6 text-center text-sm font-bold text-slate-700 dark:text-slate-100" role="status">
          {statusText}
        </div>
        <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Track for {(config.moveMs / 1000).toFixed(1)}s · Then choose the marked dots at your own pace
        </p>
        <div
          className="relative rounded-3xl bg-white/60 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
          style={{ width: 'min(100%, 320px)', aspectRatio: '1 / 1' }}
        >
          <div className="absolute inset-0" style={{ containerType: 'size' }}>
            {dots.map((d) => {
              const glow = (status === 'reveal' || status === 'over') && d.target;
              const pickedTarget = picked.has(d.id) && d.target;
              const pickedWrong = picked.has(d.id) && !d.target;
              return (
                <button
                  key={d.id}
                  onClick={() => pick(d.id)}
                  onKeyDown={(event) => {
                    if (event.repeat) event.preventDefault();
                  }}
                  aria-disabled={status !== 'select' || picked.has(d.id)}
                  aria-label={`Dot ${selectionOrder.indexOf(d.id) + 1}${pickedWrong ? ', missed' : pickedTarget ? ', found' : glow ? ', marked' : ''}`}
                  aria-pressed={picked.has(d.id)}
                  className="ml-tap absolute flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white"
                  style={{
                    width: `${(TRACK_RADIUS * 2 / TRACK_AREA) * 100}%`,
                    height: `${(TRACK_RADIUS * 2 / TRACK_AREA) * 100}%`,
                    left: `${(d.x / TRACK_AREA) * 100}%`,
                    top: `${(d.y / TRACK_AREA) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    background: pickedWrong
                      ? '#ef4444'
                      : glow || pickedTarget
                        ? accent
                        : '#94a3b8',
                    boxShadow: glow ? `0 0 18px ${accent}` : undefined,
                  }}
                >
                  <span aria-hidden="true">{pickedWrong ? '×' : pickedTarget ? '✓' : glow ? '•' : status === 'select' ? selectionOrder.indexOf(d.id) + 1 : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      </GameStage>
    </div>
  );
}
