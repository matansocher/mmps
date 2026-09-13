import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES, CATEGORY_ORDER } from '../lib/categories';
import { randInt } from '../lib/utils';
import { playSound } from '../lib/sound';

const SEEN_KEY = 'mindloop:onboarded';

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markOnboarded() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Clears the flag so the intro plays again (used by Settings → Replay intro). */
export function resetOnboarding() {
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
}

/* --- Small inline skill icons (original, on-brand, currentColor) -------- */

function SkillIcon({ id, className }: { id: string; className?: string }) {
  const p = { viewBox: '0 0 24 24', className, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'memory':
      return (
        <svg {...p}>
          <path d="M12 3a4 4 0 0 0-4 4 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V7a4 4 0 0 0-2-4Z" />
          <path d="M12 3a4 4 0 0 1 4 4 3 3 0 0 1 2 5 3 3 0 0 1-2 5" />
        </svg>
      );
    case 'attention':
      return (
        <svg {...p}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'speed':
      return (
        <svg {...p}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      );
    case 'problem-solving':
      return (
        <svg {...p}>
          <path d="M4 8a3 3 0 0 1 3-3h2a2 2 0 1 1 4 0h2a3 3 0 0 1 3 3v2a2 2 0 1 1 0 4v2a3 3 0 0 1-3 3h-2a2 2 0 1 0-4 0H7a3 3 0 0 1-3-3v-2a2 2 0 1 0 0-4V8Z" />
        </svg>
      );
    case 'flexibility':
      return (
        <svg {...p}>
          <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
          <path d="M20 4v4h-4" />
          <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" />
          <path d="M4 20v-4h4" />
        </svg>
      );
    default:
      return null;
  }
}

/* --- Mini Odd One Out taste round -------------------------------------- */

function hsl(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function makeTasteRound(round: number) {
  const size = Math.min(4, 2 + Math.floor(round / 2));
  const cells = size * size;
  const odd = randInt(0, cells - 1);
  const hue = randInt(0, 359);
  const sat = randInt(62, 78);
  const light = randInt(48, 66);
  const delta = Math.max(9, 22 - round * 2);
  const dir = Math.random() < 0.5 ? -1 : 1;
  return {
    size,
    cells,
    odd,
    base: hsl(hue, sat, light),
    diff: hsl(hue, sat, Math.min(90, Math.max(24, light + dir * delta))),
  };
}

const TASTE_SECONDS = 20;

function TasteGame({ onDone }: { onDone: (cleared: number) => void }) {
  const [round, setRound] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [remaining, setRemaining] = useState(TASTE_SECONDS);
  const [cfg, setCfg] = useState(() => makeTasteRound(0));
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (over) return;
    if (remaining <= 0) {
      setOver(true);
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(id);
  }, [remaining, over]);

  useEffect(() => {
    if (over) {
      const id = window.setTimeout(() => onDone(cleared), 250);
      return () => window.clearTimeout(id);
    }
  }, [over, cleared, onDone]);

  const tap = (i: number) => {
    if (over) return;
    if (i === cfg.odd) {
      playSound('correct');
      setCleared((c) => c + 1);
      setFlash('ok');
      const nr = round + 1;
      setRound(nr);
      setCfg(makeTasteRound(nr));
    } else {
      playSound('wrong');
      setRemaining((r) => Math.max(0, r - 2));
      setFlash('bad');
    }
    window.setTimeout(() => setFlash(null), 180);
  };

  const { size, cells, odd, base, diff } = cfg;

  return (
    <div className="flex flex-col items-center">
      <p className="mb-4 text-center text-base font-bold text-slate-600 dark:text-slate-300">
        Tap the one that&apos;s a different shade.
      </p>

      <div className="mb-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(remaining / TASTE_SECONDS) * 100}%` }}
        />
      </div>

      <motion.div
        animate={flash === 'bad' ? { x: [0, -6, 6, -4, 0] } : {}}
        transition={{ duration: 0.25 }}
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          width: `min(72vw, ${size * 76}px)`,
        }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <motion.button
            key={`${round}-${i}`}
            whileTap={{ scale: 0.9 }}
            onClick={() => tap(i)}
            className="ml-tap aspect-square rounded-2xl shadow-sm"
            style={{ background: i === odd ? diff : base }}
          />
        ))}
      </motion.div>

      <p className="mt-4 text-sm font-bold tabular-nums text-slate-400 dark:text-slate-500">
        Found: {cleared}
      </p>
    </div>
  );
}

/* --- Steps ------------------------------------------------------------- */

type StepKind = 'welcome' | 'skills' | 'why' | 'streak' | 'taste' | 'celebrate';

const STEPS: StepKind[] = ['welcome', 'skills', 'why', 'streak', 'taste', 'celebrate'];

/**
 * First-run onboarding: a short, swipeable story flow that frames Mindloop as
 * a brain workout, ending in a real ~20s mini-game taste and a celebration.
 * Shows once per device (gated by localStorage), skippable, and replayable
 * from Settings. Device-local only — never synced to the backend.
 */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [tasteResult, setTasteResult] = useState<number | null>(null);
  const step = STEPS[index];

  const accent = useMemo(() => {
    switch (step) {
      case 'skills':
        return CATEGORIES.memory.accent;
      case 'why':
        return CATEGORIES['problem-solving'].accent;
      case 'streak':
        return CATEGORIES.speed.accent;
      case 'taste':
        return CATEGORIES.attention.accent;
      case 'celebrate':
        return CATEGORIES.flexibility.accent;
      default:
        return CATEGORIES.memory.accent;
    }
  }, [step]);

  const finish = useCallback(() => {
    markOnboarded();
    onClose();
  }, [onClose]);

  const next = () => {
    playSound('click');
    setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const onTasteDone = useCallback((cleared: number) => {
    setTasteResult(cleared);
    setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }, []);

  return (
    <div className="ml-app-bg fixed inset-0 z-[60] flex flex-col">
      {/* Top bar: progress dots + skip */}
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 22 : 8,
                background: i <= index ? accent : 'rgba(148,163,184,0.4)',
              }}
            />
          ))}
        </div>
        {step !== 'celebrate' && (
          <button
            onClick={finish}
            className="ml-tap rounded-full px-3 py-1.5 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Skip
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-md text-center"
          >
            {step === 'welcome' && (
              <>
                <div
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] text-5xl shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${CATEGORIES.memory.accent}, ${CATEGORIES.attention.accent})` }}
                >
                  🧠
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-4xl">
                  Welcome to Mindloop
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-lg font-medium text-slate-500 dark:text-slate-400">
                  Think of it as a gym for your brain — quick, playful games you can fit into a few minutes a day.
                </p>
              </>
            )}

            {step === 'skills' && (
              <>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-3xl">
                  Train 5 mental skills
                </h1>
                <p className="mx-auto mt-2 max-w-sm font-medium text-slate-500 dark:text-slate-400">
                  Every game targets one of these — so a short session works your whole mind.
                </p>
                <div className="mt-6 space-y-2.5">
                  {CATEGORY_ORDER.map((id, i) => {
                    const c = CATEGORIES[id];
                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * i + 0.1 }}
                        className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 text-left shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10"
                      >
                        <div
                          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-white shadow-sm"
                          style={{ background: c.accent }}
                        >
                          <SkillIcon id={id} className="h-6 w-6" />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-100">{c.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {step === 'why' && (
              <>
                <div
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-xl"
                  style={{ background: accent }}
                >
                  <SkillIcon id="problem-solving" className="h-10 w-10" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-3xl">
                  Small reps, big compounding
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-lg font-medium text-slate-500 dark:text-slate-400">
                  Just like a workout, consistency beats intensity. A few focused minutes each day keeps you sharp and
                  engaged.
                </p>
              </>
            )}

            {step === 'streak' && (
              <>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-xl" style={{ background: `linear-gradient(135deg, ${accent}, #f97316)` }}>
                  🔥
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-3xl">
                  Build a daily streak
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-lg font-medium text-slate-500 dark:text-slate-400">
                  Play a little every day to grow your streak. Come back tomorrow to keep it alive — that&apos;s where
                  the magic happens.
                </p>
              </>
            )}

            {step === 'taste' && (
              <>
                <h1 className="mb-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-3xl">
                  Let&apos;s try one!
                </h1>
                <TasteGame onDone={onTasteDone} />
              </>
            )}

            {step === 'celebrate' && (
              <>
                <motion.div
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] text-5xl shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${CATEGORIES.flexibility.accent}, ${CATEGORIES.speed.accent})` }}
                >
                  🎉
                </motion.div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-4xl">
                  You&apos;re a natural!
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-lg font-medium text-slate-500 dark:text-slate-400">
                  {tasteResult && tasteResult > 0
                    ? `You spotted ${tasteResult} in one go. That's your Attention skill at work.`
                    : "That's just a taste — every game gets easier as you practice."}{' '}
                  Ready to build your streak?
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {step === 'taste' ? (
          <p className="text-center text-sm font-medium text-slate-400 dark:text-slate-500">
            Finishes automatically…
          </p>
        ) : (
          <button
            onClick={step === 'celebrate' ? finish : next}
            className="ml-tap mx-auto block w-full max-w-md rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg transition-transform active:scale-95"
            style={{ background: `linear-gradient(135deg, ${accent}, ${CATEGORIES.attention.accent})` }}
          >
            {step === 'celebrate' ? 'Start playing' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
