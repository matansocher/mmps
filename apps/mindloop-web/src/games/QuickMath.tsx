import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { randInt, shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { useTheme } from '../hooks/useTheme';

const accent = CATEGORIES['problem-solving'].accent;
const TOTAL_TIME = 45;

type Op = '+' | '−' | '×' | '÷';

interface Problem {
  text: string;
  answer: number;
  options: number[];
  reward: number;
}

function makeProblem(level: number): Problem {
  // Difficulty scales operand range and unlocks operators with level.
  const ops: Op[] = ['+', '−'];
  if (level >= 2) ops.push('×');
  if (level >= 4) ops.push('÷');
  const op = ops[randInt(0, ops.length - 1)];
  const mag = 5 + level * 3;

  let a = 0;
  let b = 0;
  let answer = 0;
  switch (op) {
    case '+':
      a = randInt(2, mag); b = randInt(2, mag); answer = a + b; break;
    case '−':
      a = randInt(2, mag); b = randInt(1, a); answer = a - b; break;
    case '×':
      a = randInt(2, Math.min(12, 3 + level)); b = randInt(2, Math.min(12, 3 + level)); answer = a * b; break;
    case '÷':
      b = randInt(2, Math.min(12, 3 + level)); answer = randInt(2, Math.min(12, 3 + level)); a = b * answer; break;
  }

  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const delta = randInt(-Math.max(3, Math.floor(answer / 2)), Math.max(3, Math.floor(answer / 2)));
    const cand = answer + delta;
    if (cand >= 0 && cand !== answer) options.add(cand);
  }

  return {
    text: `${a} ${op} ${b}`,
    answer,
    options: shuffle([...options]),
    reward: 10 + level * 5,
  };
}

export default function QuickMath({ onFinish }: GameProps) {
  const { theme } = useTheme();
  const [counting, setCounting] = useState(true);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(() => makeProblem(0));
  const [chosen, setChosen] = useState<number | null>(null);
  const finished = useRef(false);
  const scoreRef = useRef(0);
  const solvedRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { solvedRef.current = solved; }, [solved]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({
      score: scoreRef.current,
      stats: [{ label: 'Solved', value: String(solvedRef.current) }],
    });
  }, [onFinish]);

  const timer = useCountdown({ seconds: TOTAL_TIME, autoStart: false, onExpire: finish });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  const choose = (val: number) => {
    if (counting || chosen !== null || finished.current) return;
    setChosen(val);
    const correct = val === problem.answer;

    if (correct) {
      setScore((s) => s + problem.reward + Math.min(30, streak * 3));
      setSolved((n) => n + 1);
      const ns = streak + 1;
      setStreak(ns);
      if (ns % 2 === 0) setLevel((l) => l + 1);
      playSound('correct');
    } else {
      setStreak(0);
      setLevel((l) => Math.max(0, l - 1));
      timer.addTime(-3);
      playSound('wrong');
    }

    window.setTimeout(() => {
      if (finished.current) return;
      setProblem(makeProblem(correct ? Math.min(12, level + (streak + 1) % 2) : Math.max(0, level - 1)));
      setChosen(null);
    }, 350);
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
            status={streak > 1 ? `x${streak}` : undefined}
          />
        }
      >
        <div className="w-full" style={{ maxWidth: 400 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={problem.text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="mb-6 rounded-3xl bg-white/70 py-10 text-center text-5xl font-extrabold text-slate-800 shadow-sm ring-1 ring-slate-200 sm:text-6xl dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"
            >
              {problem.text}
              <span className="text-slate-300"> = ?</span>
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3">
            {problem.options.map((opt) => {
              const isChosen = chosen === opt;
              const isCorrect = opt === problem.answer;
              let bg = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#ffffff';
              let color = theme === 'dark' ? '#e2e8f0' : '#334155';
              if (chosen !== null) {
                if (isCorrect) { bg = accent; color = '#fff'; }
                else if (isChosen) { bg = '#ef4444'; color = '#fff'; }
              }
              return (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => choose(opt)}
                  className="ml-tap rounded-2xl py-6 text-2xl font-extrabold shadow-sm ring-1 ring-slate-200 dark:ring-white/10"
                  style={{ background: bg, color }}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </div>
      </GameStage>
    </div>
  );
}
