import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { cx, randInt } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';

const accent = CATEGORIES.memory.accent;

const PADS = [
  { on: '#f87171', off: '#fecaca' },
  { on: '#60a5fa', off: '#bfdbfe' },
  { on: '#facc15', off: '#fef08a' },
  { on: '#34d399', off: '#a7f3d0' },
];

type Status = 'watch' | 'input' | 'over';

export default function SequenceEcho({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [sequence, setSequence] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('watch');
  const [, setInputIndex] = useState(0);
  const [score, setScore] = useState(0);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const playSequence = useCallback((seq: number[]) => {
    setStatus('watch');
    setInputIndex(0);
    const step = Math.max(350, 700 - seq.length * 25);
    seq.forEach((pad, i) => {
      timers.current.push(
        window.setTimeout(() => setActive(pad), i * step + 150),
      );
      timers.current.push(
        window.setTimeout(() => setActive(null), i * step + 150 + step * 0.6),
      );
    });
    timers.current.push(
      window.setTimeout(() => setStatus('input'), seq.length * step + 200),
    );
  }, []);

  const nextRound = useCallback(
    (prev: number[]) => {
      const seq = [...prev, randInt(0, 3)];
      setSequence(seq);
      playSequence(seq);
    },
    [playSequence],
  );

  const start = useCallback(() => {
    setCounting(false);
    nextRound([]);
  }, [nextRound]);

  const flash = (pad: number) => {
    setActive(pad);
    timers.current.push(window.setTimeout(() => setActive(null), 200));
  };

  const handleTap = (pad: number) => {
    if (status !== 'input') return;
    flash(pad);

    setInputIndex((idx) => {
      if (sequence[idx] === pad) {
        const nextIdx = idx + 1;
        if (nextIdx === sequence.length) {
          setScore((s) => s + sequence.length * 10);
          setStatus('watch');
          playSound('correct');
          timers.current.push(window.setTimeout(() => nextRound(sequence), 700));
          return 0;
        }
        return nextIdx;
      }
      if (!finished.current) {
        finished.current = true;
        setStatus('over');
        clearTimers();
        playSound('wrong');
        timers.current.push(
          window.setTimeout(
            () => onFinish({
              score,
              stats: [{ label: 'Sequence length', value: String(sequence.length) }],
            }),
            700,
          ),
        );
      }
      return idx;
    });
  };

  const statusText = status === 'watch' ? 'Watch…' : status === 'input' ? 'Repeat it!' : '\u00A0';

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} status={String(sequence.length)} />}>
        <div className="mb-4 h-6 text-sm font-bold" style={{ color: accent }}>
          {statusText}
        </div>
        <div className="grid grid-cols-2 gap-3" style={{ width: 'min(80vw, 320px)' }}>
          {PADS.map((pad, i) => {
            const isOn = active === i;
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleTap(i)}
                disabled={status !== 'input'}
                className={cx(
                  'ml-tap aspect-square rounded-3xl shadow-md transition-all duration-100',
                  isOn ? 'scale-105' : '',
                )}
                style={{
                  background: isOn ? pad.on : pad.off,
                  boxShadow: isOn ? `0 0 32px ${pad.on}` : undefined,
                }}
              />
            );
          })}
        </div>
      </GameStage>
    </div>
  );
}
