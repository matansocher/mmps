import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useCountdown } from '../hooks/useCountdown';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { getColorClashDifficulty, getReactionLevel, getReactionProgress, makeColorClashRound } from './reaction-progression';

const accent = CATEGORIES.flexibility.accent;
const TOTAL_TIME = 40;

export default function ColorClash({ onFinish }: GameProps) {
  const { theme } = useTheme();
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(() => makeColorClashRound(0));
  const [completed, setCompleted] = useState(0);
  const difficulty = getColorClashDifficulty(completed);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const finished = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  const locked = useRef(false);
  useLayoutEffect(() => {
    locked.current = chosen !== null;
  }, [chosen]);
  const nextRound = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(nextRound.current), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [
        { label: 'Correct', value: String(correctRef.current) },
        { label: 'Best combo', value: String(bestRef.current) },
        { label: 'Level reached', value: String(getReactionLevel(correctRef.current)) },
      ],
    });
  }, [onFinish]);

  const { remaining, running, reset, addTime, isExpired } = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    reset(TOTAL_TIME);
  }, [reset]);

  const choose = useCallback(
    (name: string) => {
      if (counting || locked.current || finished.current || !running || isExpired()) return;
      locked.current = true;
      setChosen(name);
      const isCorrect = name === round.ink.name;
      if (isCorrect) {
        const nc = combo + 1;
        correctRef.current += 1;
        setCombo(nc);
        bestRef.current = Math.max(bestRef.current, nc);
        scoreRef.current += difficulty.reward + Math.min(40, nc * 2);
        setScore(scoreRef.current);
        playSound('correct');
      } else {
        setCombo(0);
        scoreRef.current = Math.max(0, scoreRef.current - 5);
        setScore(scoreRef.current);
        addTime(-2);
        playSound('wrong');
      }
      nextRound.current = window.setTimeout(() => {
        if (finished.current) return;
        setRound(makeColorClashRound(correctRef.current));
        setCompleted(correctRef.current);
        setChosen(null);
      }, isCorrect ? 250 : 800);
    },
    [counting, running, isExpired, addTime, round, combo, difficulty.reward],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = ['1', '2', '3', '4', '5'].indexOf(event.key);
      if (index < 0 || !round.options[index]) return;
      event.preventDefault();
      choose(round.options[index].name);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, round]);

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage hud={<HUD accent={accent} score={score} time={remaining} timeFraction={remaining / TOTAL_TIME} statusLabel="Streak" status={String(combo)} />}>
        <div className="w-full" style={{ maxWidth: 400 }}>
          <p className="mb-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{getReactionProgress(completed)}</p>
          <p className="mb-4 text-center text-sm font-bold text-slate-600 dark:text-slate-300">Tap the INK color, not the word</p>
          <motion.div
            initial={false}
            className="mb-8 rounded-3xl bg-white/70 py-12 text-center text-6xl font-extrabold shadow-sm ring-1 ring-slate-200 sm:text-7xl dark:bg-white/10 dark:ring-white/10"
            style={{ color: theme === 'dark' ? round.ink.hex : round.ink.light }}
          >
            {round.word.name}
          </motion.div>
          <p role="status" className="mb-3 min-h-6 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
            {chosen === null ? `Tap a color or press 1–${round.options.length}` : chosen === round.ink.name ? 'Correct ink color!' : `Ink: ${round.ink.name} · −5 points, −2s`}
          </p>

          <div className="grid grid-cols-3 grid-rows-2 gap-3">
            {round.options.map((c, index) => {
              const isChosen = chosen === c.name;
              const isCorrect = c.name === round.ink.name;
              const dim = chosen !== null && !isChosen && !isCorrect;
              const showState = chosen !== null && (isChosen || isCorrect);
              return (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => choose(c.name)}
                  onKeyDown={(event) => {
                    if (event.repeat) event.preventDefault();
                  }}
                  disabled={counting || chosen !== null || !running}
                  className="ml-tap flex flex-col items-center gap-1 rounded-2xl py-4 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                  style={{
                    background: showState
                      ? isCorrect
                        ? theme === 'dark'
                          ? 'rgba(34,197,94,0.2)'
                          : '#dcfce7'
                        : theme === 'dark'
                          ? 'rgba(239,68,68,0.25)'
                          : '#fee2e2'
                      : theme === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : '#fff',
                    color: showState && isCorrect ? '#fff' : c.hex,
                    opacity: dim ? 0.4 : 1,
                  }}
                >
                  <span className="h-6 w-6 rounded-full" style={{ background: c.hex }} />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {index + 1}. {c.name}
                    {showState ? (isCorrect ? ' ✓' : ' ✕') : ''}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameStage>
    </div>
  );
}
