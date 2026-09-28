import { useCallback, useEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useGameRuntime } from '../hooks/useGameRuntime';
import { CATEGORIES } from '../lib/categories';
import { playPad, playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { cx, randInt } from '../lib/utils';

const accent = CATEGORIES.memory.accent;

const PADS = [
  { on: '#f87171', off: '#fecaca' },
  { on: '#60a5fa', off: '#bfdbfe' },
  { on: '#facc15', off: '#fef08a' },
  { on: '#34d399', off: '#a7f3d0' },
];

type Status = 'watch' | 'input' | 'complete' | 'over';

export default function SequenceEcho({ onFinish }: GameProps) {
  const { clock, practice } = useGameRuntime();
  const [counting, setCounting] = useState(true);
  const [sequence, setSequence] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('watch');
  const [inputIndex, setInputIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [expected, setExpected] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const statusRef = useRef<Status>('watch');
  const inputIndexRef = useRef(0);
  const flashTimer = useRef<number | undefined>(undefined);
  const mistakes = useRef(0);
  const started = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clock.clearTimeout(t));
    timers.current = [];
    clock.clearTimeout(flashTimer.current);
  }, [clock]);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const playSequence = useCallback(
    (seq: number[]) => {
      clearTimers();
      statusRef.current = 'watch';
      setStatus('watch');
      setActive(null);
      inputIndexRef.current = 0;
      setInputIndex(0);
      const step = Math.max(350, 700 - seq.length * 25);
      seq.forEach((pad, i) => {
        timers.current.push(
          clock.setTimeout(
            () => {
              setActive(pad);
              playPad(pad);
            },
            i * step + 150,
          ),
        );
        timers.current.push(clock.setTimeout(() => setActive(null), i * step + 150 + step * 0.6));
      });
      timers.current.push(
        clock.setTimeout(
          () => {
            statusRef.current = 'input';
            setStatus('input');
          },
          seq.length * step + 200,
        ),
      );
    },
    [clearTimers, clock],
  );

  const nextRound = useCallback(
    (prev: number[]) => {
      const seq = [...prev, randInt(0, 3)];
      setSequence(seq);
      playSequence(seq);
    },
    [playSequence],
  );

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setCounting(false);
    nextRound([]);
  }, [nextRound]);

  const flash = (pad: number) => {
    clock.clearTimeout(flashTimer.current);
    setActive(pad);
    playPad(pad);
    flashTimer.current = clock.setTimeout(() => setActive(null), 180);
  };

  const handleTap = (pad: number) => {
    if (statusRef.current !== 'input') return;
    flash(pad);

    const idx = inputIndexRef.current;
    if (sequence[idx] === pad) {
      const nextIdx = idx + 1;
      inputIndexRef.current = nextIdx;
      setInputIndex(nextIdx);
      if (nextIdx === sequence.length) {
        statusRef.current = 'complete';
        setScore((s) => s + sequence.length * 10);
        setStatus('complete');
        playSound('correct');
        timers.current.push(
          clock.setTimeout(() => {
            if (practice && sequence.length >= 6) {
              onFinish({ score: score + sequence.length * 10, stats: [{ label: 'Longest completed', value: String(sequence.length) }] });
              return;
            }
            nextRound(sequence);
          }, 700),
        );
      }
      return;
    }

    if (practice && ++mistakes.current < 3) {
      setExpected(sequence[idx]);
      playSequence(sequence);
      return;
    }
    statusRef.current = 'over';
    setStatus('over');
    setExpected(sequence[idx]);
    clearTimers();
    setActive(sequence[idx]);
    playSound('wrong');
    sequence.forEach((pad, i) => {
      timers.current.push(
        clock.setTimeout(
          () => {
            setActive(pad);
            playPad(pad);
          },
          600 + i * 550,
        ),
        clock.setTimeout(() => setActive(null), 950 + i * 550),
      );
    });
    timers.current.push(
      clock.setTimeout(
        () =>
          onFinish({
            score,
            stats: [
              { label: 'Longest completed', value: String(Math.max(0, sequence.length - 1)) },
              { label: 'Sequence reached', value: String(sequence.length) },
            ],
          }),
        1000 + sequence.length * 550,
      ),
    );
  };

  const statusText =
    status === 'watch'
      ? 'Watch the order…'
      : status === 'input'
        ? `Repeat it · ${inputIndex}/${sequence.length}`
        : status === 'complete'
          ? `Sequence complete! +${sequence.length * 10}`
          : `Next was pad ${(expected ?? 0) + 1} · here is the sequence again`;

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} status={String(sequence.length)} />}>
        <div className="mb-4 min-h-6 text-center text-sm font-bold text-slate-700 dark:text-slate-100" role="status">
          {statusText}
        </div>
        <div className="grid grid-cols-2 gap-3" style={{ width: 'min(100%, 320px)' }}>
          {PADS.map((pad, i) => {
            const isOn = active === i;
            return (
              <button
                key={i}
                onClick={() => handleTap(i)}
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
                aria-disabled={status !== 'input'}
                aria-label={`Pad ${i + 1}${isOn ? ', lit' : ''}`}
                className={cx(
                  'ml-tap aspect-square rounded-3xl text-3xl font-extrabold text-slate-900 shadow-md transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-700 dark:focus-visible:outline-white',
                  isOn ? 'ring-4 ring-inset ring-slate-800' : '',
                  status === 'input' ? 'cursor-pointer' : 'cursor-default',
                )}
                style={{
                  background: isOn ? pad.on : pad.off,
                  boxShadow: isOn ? `0 0 32px ${pad.on}` : undefined,
                }}
              >
                <span aria-hidden="true">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </GameStage>
    </div>
  );
}
