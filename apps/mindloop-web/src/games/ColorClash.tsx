import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { pick, shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { useTheme } from '../hooks/useTheme';

const accent = CATEGORIES.flexibility.accent;
const TOTAL_TIME = 40;

const COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Purple', hex: '#a855f7' },
];

function makeRound() {
  const word = pick(COLORS);
  // Ink color is usually different from the word for interference.
  const ink = Math.random() < 0.25 ? word : pick(COLORS.filter((c) => c.name !== word.name));
  const options = shuffle(COLORS);
  return { word, ink, options };
}

export default function ColorClash({ onFinish }: GameProps) {
  const { theme } = useTheme();
  const [counting, setCounting] = useState(true);
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const finished = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const bestRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { correctRef.current = correct; }, [correct]);
  useEffect(() => { bestRef.current = best; }, [best]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [
        { label: 'Correct', value: String(correctRef.current) },
        { label: 'Best combo', value: String(bestRef.current) },
      ],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  const choose = (name: string) => {
    if (counting || chosen !== null || finished.current) return;
    setChosen(name);
    const isCorrect = name === round.ink.name;
    if (isCorrect) {
      const nc = combo + 1;
      setCorrect((c) => c + 1);
      setCombo(nc);
      setBest((b) => Math.max(b, nc));
      setScore((s) => s + 10 + Math.min(40, nc * 2));
      playSound('correct');
    } else {
      setCombo(0);
      setScore((s) => Math.max(0, s - 5));
      timer.addTime(-2);
      playSound('wrong');
    }
    window.setTimeout(() => {
      if (finished.current) return;
      setRound(makeRound());
      setChosen(null);
    }, 300);
  };

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
            status={combo > 1 ? `x${combo}` : undefined}
          />
        }
      >
        <div className="w-full" style={{ maxWidth: 400 }}>
          <p className="mb-4 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
            Tap the INK color, not the word
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${round.word.name}-${round.ink.name}-${score}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.18 }}
              className="mb-8 rounded-3xl bg-white/70 py-12 text-center text-6xl font-extrabold shadow-sm ring-1 ring-slate-200 sm:text-7xl dark:bg-white/10 dark:ring-white/10"
              style={{ color: round.ink.hex }}
            >
              {round.word.name}
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-3">
            {round.options.map((c) => {
              const isChosen = chosen === c.name;
              const isCorrect = c.name === round.ink.name;
              const dim = chosen !== null && !isChosen && !isCorrect;
              const showState = chosen !== null && (isChosen || isCorrect);
              return (
                <motion.button
                  key={c.name}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => choose(c.name)}
                  className="ml-tap flex flex-col items-center gap-1 rounded-2xl py-4 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                  style={{
                    background: showState
                      ? isCorrect
                        ? c.hex
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
                  <span className="text-xs text-slate-500 dark:text-slate-300">{c.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameStage>
    </div>
  );
}
