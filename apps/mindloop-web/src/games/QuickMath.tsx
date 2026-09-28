import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { useGameRuntime } from '../hooks/useGameRuntime';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { readJson } from '../lib/progress';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { makeMathProblem, nextMathLevel } from './quick-math.logic';

const accent = CATEGORIES['problem-solving'].accent;
const TOTAL_TIME = 45;

export default function QuickMath({ onFinish }: GameProps) {
  const { clock, practice } = useGameRuntime();
  const { theme } = useTheme();
  const startingLevel = practice ? Math.max(0, Math.min(6, readJson<number>('mindloop:math-level', 0))) : 0;
  const [counting, setCounting] = useState(true);
  const [level, setLevel] = useState(startingLevel);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(() => makeMathProblem(startingLevel));
  const [chosen, setChosen] = useState<number | null>(null);
  const finished = useRef(false);
  const scoreRef = useRef(0);
  const solvedRef = useRef(0);
  const locked = useRef(false);
  useLayoutEffect(() => {
    locked.current = chosen !== null;
  }, [chosen]);
  const nextRound = useRef<number | undefined>(undefined);
  useEffect(() => () => clock.clearTimeout(nextRound.current), [clock]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [{ label: 'Solved', value: String(solvedRef.current) }],
    });
  }, [onFinish]);

  const { remaining, running, reset, isExpired } = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    reset(TOTAL_TIME);
  }, [reset]);

  const choose = useCallback(
    (val: number) => {
      if (counting || locked.current || finished.current || !running || isExpired()) return;
      locked.current = true;
      setChosen(val);
      const correct = val === problem.answer;
      const nextStreak = correct ? streak + 1 : 0;
      const nextLevel = nextMathLevel(level, nextStreak, correct);
      setStreak(nextStreak);

      if (correct) {
        scoreRef.current += problem.reward + Math.min(30, streak * 3);
        setScore(scoreRef.current);
        solvedRef.current += 1;
        playSound('correct');
      } else {
        playSound('wrong');
      }

      nextRound.current = clock.setTimeout(
        () => {
          if (finished.current) return;
          setLevel(nextLevel);
          setProblem(makeMathProblem(nextLevel));
          setChosen(null);
        },
        correct ? 300 : 900,
      );
    },
    [counting, running, isExpired, problem.answer, problem.reward, streak, level, clock],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (clock.isPaused()) return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      if (index < 0) return;
      event.preventDefault();
      choose(problem.options[index]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, clock, problem]);

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} time={remaining} timeFraction={remaining / TOTAL_TIME} statusLabel="Level" status={String(level + 1)} />}>
        <div className="w-full" style={{ maxWidth: 400 }}>
          <p className="mb-3 text-center text-sm font-bold text-slate-600 dark:text-slate-300">Solve it. Tap an answer or press 1–4.</p>
          <motion.div
            initial={false}
            className={`mb-6 rounded-3xl bg-white/70 px-3 py-10 text-center font-extrabold text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-100 ${level >= 8 ? 'text-2xl sm:text-4xl' : 'text-5xl sm:text-6xl'}`}
          >
            {problem.text}
            <span className="text-slate-300"> = ?</span>
          </motion.div>
          <p role="status" className="mb-3 min-h-6 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
            {chosen === null
              ? level >= 8
                ? 'Brackets first, then multiplication or division'
                : streak > 1
                  ? `${streak} in a row · keep going`
                  : 'Two correct in a row raises the level'
              : chosen === problem.answer
                ? 'Correct!'
                : `${problem.text} = ${problem.answer} · try the next one`}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((opt, index) => {
              const isChosen = chosen === opt;
              const isCorrect = opt === problem.answer;
              let bg = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#ffffff';
              let color = theme === 'dark' ? '#e2e8f0' : '#334155';
              if (chosen !== null) {
                if (isCorrect) {
                  bg = accent;
                  color = '#fff';
                } else if (isChosen) {
                  bg = '#ef4444';
                  color = '#fff';
                }
              }
              return (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => choose(opt)}
                  onKeyDown={(event) => {
                    if (event.repeat) event.preventDefault();
                  }}
                  disabled={counting || chosen !== null || !running}
                  className="ml-tap rounded-2xl py-6 text-2xl font-extrabold shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                  style={{ background: bg, color }}
                >
                  <span className="block text-xs opacity-70">{index + 1}</span>
                  {opt}
                  {chosen !== null && isCorrect ? ' ✓' : isChosen ? ' ✕' : ''}
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameStage>
    </div>
  );
}
