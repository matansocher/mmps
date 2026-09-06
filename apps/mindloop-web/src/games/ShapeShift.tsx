import { MotionConfig, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { cx } from '../lib/utils';
import { createShapeRound, INITIAL_SHAPE_SCORE, scoreShapeAnswer } from './shape-shift';
import type { Shape } from './shape-shift';

const TOTAL_TIME = 60;
const ACCENT = CATEGORIES.speed.accent;

function ShapePicture({ shape, label }: { readonly shape: Shape; readonly label: string }) {
  const width = Math.max(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) + 1;
  return (
    <svg viewBox="0 0 140 140" role="img" aria-label={label} className="h-full w-full">
      <g transform={`translate(${(140 - width * 24) / 2} ${(140 - height * 24) / 2})`} fill="currentColor">
        {shape.map(([x, y]) => (
          <rect key={`${x},${y}`} x={x * 24} y={y * 24} width="24" height="24" rx="2" />
        ))}
      </g>
    </svg>
  );
}

export function ShapeShift({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(() => createShapeRound(0));
  const [tally, setTally] = useState(INITIAL_SHAPE_SCORE);
  const [feedback, setFeedback] = useState<{ readonly right: boolean; readonly selected: number } | null>(null);
  const tallyRef = useRef(tally);
  const finished = useRef(false);
  const locked = useRef(true);
  const { reducedMotion } = useTheme();
  const systemReducedMotion = useReducedMotion();

  useEffect(() => {
    finished.current = false;
    return () => { finished.current = true; };
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    locked.current = true;
    const result = tallyRef.current;
    onFinish({
      score: result.score,
      stats: [
        { label: 'Shapes matched', value: String(result.correct) },
        { label: 'Accuracy', value: `${result.attempts ? Math.round((result.correct / result.attempts) * 100) : 0}%` },
        { label: 'Best streak', value: String(result.bestStreak) },
        { label: 'Level reached', value: String(Math.min(3, 1 + Math.floor(result.correct / 4))) },
      ],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });
  const { reset } = timer;
  const start = useCallback(() => {
    setCounting(false);
    locked.current = false;
    reset(TOTAL_TIME);
  }, [reset]);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(
      () => {
        if (finished.current) return;
        setRound(createShapeRound(tallyRef.current.correct));
        setFeedback(null);
        locked.current = false;
      },
      feedback.right ? 450 : 900,
    );
    return () => window.clearTimeout(id);
  }, [feedback]);

  const answer = useCallback(
    (selected: number) => {
      if (locked.current || counting || finished.current || timer.remaining <= 0) return;
      locked.current = true;
      const right = selected === round.correctIndex;
      const next = scoreShapeAnswer(tallyRef.current, right, round.level);
      tallyRef.current = next;
      setTally(next);
      setFeedback({ right, selected });
      playSound(right ? 'correct' : 'wrong');
    },
    [counting, timer.remaining, round],
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= round.options.length) return;
      event.preventDefault();
      answer(index);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [answer, round.options.length]);

  return (
    <MotionConfig reducedMotion={reducedMotion || systemReducedMotion ? 'always' : 'never'}>
      <div className="relative flex flex-1 flex-col py-4">
        {counting && <CountdownOverlay accent={ACCENT} onDone={start} />}
        <GameStage hud={<HUD accent={ACCENT} score={tally.score} time={timer.remaining} timeFraction={timer.remaining / TOTAL_TIME} status={String(round.level)} statusLabel="Level" />}>
          <div className="flex w-full max-w-md flex-col items-center gap-4 py-4">
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Same shape. New angle.</h2>
              <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
                {round.level > 1 ? 'Rotate it in your mind. A mirror image does not match.' : 'Which outline matches the target when rotated?'}
              </p>
            </div>
            <div className="flex w-full items-center justify-center gap-6 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-800">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-200">Target</span>
                <div className="h-32 w-32 text-amber-700 dark:text-amber-300">
                  <ShapePicture shape={round.target} label="Target outline" />
                </div>
              </div>
              <div className="text-center text-amber-900 dark:text-amber-100">
                <div className="text-3xl font-extrabold tabular-nums">{tally.streak}</div>
                <div className="text-sm font-semibold">in a row</div>
              </div>
            </div>
            <p role="status" className="min-h-12 text-center text-base font-bold text-slate-700 dark:text-slate-200">
              {feedback ? (feedback.right ? 'Perfect match! Keep it going.' : `Not quite. Option ${round.correctIndex + 1} is the match.`) : 'Tap the matching shape'}
            </p>
            <div className={cx('grid w-full gap-3', round.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
              {round.options.map((shape, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Option ${index + 1}`}
                  disabled={counting || feedback !== null || timer.remaining <= 0}
                  onClick={() => answer(index)}
                  className={cx(
                    'ml-tap flex min-h-32 flex-col items-center rounded-2xl p-2 text-amber-700 shadow-sm ring-2 transition-colors focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-amber-600 disabled:cursor-default dark:text-amber-300',
                    feedback && index === round.correctIndex
                      ? 'bg-emerald-100 ring-emerald-600 dark:bg-emerald-950 dark:ring-emerald-400'
                      : feedback && index === feedback.selected
                        ? 'bg-rose-100 ring-rose-600 dark:bg-rose-950 dark:ring-rose-400'
                        : 'bg-white ring-slate-200 enabled:hover:bg-amber-50 enabled:active:bg-amber-100 dark:bg-slate-800 dark:ring-slate-600 dark:enabled:hover:bg-slate-700',
                  )}
                >
                  <div className="h-24 w-full">
                    <ShapePicture shape={shape} label={`Outline ${index + 1}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {index + 1}
                    {feedback && index === round.correctIndex ? ' - Match' : ''}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">Accuracy builds your streak. Keyboard: 1-{round.options.length}.</p>
          </div>
        </GameStage>
      </div>
    </MotionConfig>
  );
}
