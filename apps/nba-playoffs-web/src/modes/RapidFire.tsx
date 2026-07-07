import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SEASONS, flattenSeason } from '../lib/playoffs';
import { loadProfile, recordRapid } from '../lib/storage';
import { haptic } from '../lib/haptics';
import { teamStyle, shortName } from '../lib/teams';
import { useCountUp } from '../lib/useCountUp';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';

const QUESTION_MS = 5000;
const CORRECT_DELAY = 460;
const REVEAL_DELAY = 1200;

type Question = {
  readonly id: string;
  readonly season: number;
  readonly round: string;
  readonly left: string;
  readonly right: string;
  readonly winner: string;
  readonly result: string;
};

type Answered = { readonly pick: string | null; readonly correct: boolean };
type Phase = 'intro' | 'play' | 'over';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Every real playoff series across all seasons becomes a question.
function buildDeck(): Question[] {
  const out: Question[] = [];
  for (const season of SEASONS) {
    for (const s of flattenSeason(season)) {
      const flip = Math.random() < 0.5;
      out.push({
        id: `${season.season}-${s.round}-${s.higherSeed.team}-${s.lowerSeed.team}`,
        season: season.season,
        round: s.round,
        left: flip ? s.lowerSeed.team : s.higherSeed.team,
        right: flip ? s.higherSeed.team : s.lowerSeed.team,
        winner: s.winner,
        result: s.result,
      });
    }
  }
  return out;
}

export function RapidFire() {
  const [seed, setSeed] = useState(0);
  return <Run key={seed} onPlayAgain={() => setSeed((s) => s + 1)} />;
}

function Run({ onPlayAgain }: { onPlayAgain: () => void }) {
  const deck = useMemo(() => shuffle(buildDeck()), []);
  const initialBest = useMemo(() => loadProfile().bestRapidStreak, []);

  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);

  const clockRef = useRef<number[]>([]);
  const flowRef = useRef<number | null>(null);
  const recorded = useRef(false);

  const q = deck[qIndex % deck.length];
  const best = Math.max(initialBest, streak);

  function clearClock() {
    clockRef.current.forEach((t) => window.clearTimeout(t));
    clockRef.current = [];
  }

  function endRun(finalStreak: number) {
    if (!recorded.current) {
      recorded.current = true;
      recordRapid(finalStreak);
    }
    setPhase('over');
  }

  function next() {
    setAnswered(null);
    setQIndex((i) => i + 1);
  }

  function pick(team: string) {
    if (answered) return;
    clearClock();
    const correct = team === q.winner;
    setAnswered({ pick: team, correct });
    if (correct) {
      haptic('success');
      setStreak((s) => s + 1);
      flowRef.current = window.setTimeout(next, CORRECT_DELAY);
    } else {
      haptic('error');
      flowRef.current = window.setTimeout(() => endRun(streak), REVEAL_DELAY);
    }
  }

  function timeout() {
    if (answered) return;
    clearClock();
    haptic('error');
    setAnswered({ pick: null, correct: false });
    flowRef.current = window.setTimeout(() => endRun(streak), REVEAL_DELAY);
  }

  // Per-question 5s clock (only while awaiting an answer).
  useEffect(() => {
    if (phase !== 'play' || answered) return;
    const warn = window.setTimeout(() => haptic('light'), QUESTION_MS - 1600);
    const expire = window.setTimeout(timeout, QUESTION_MS);
    clockRef.current.push(warn, expire);
    return clearClock;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex, answered]);

  useEffect(
    () => () => {
      clearClock();
      if (flowRef.current) window.clearTimeout(flowRef.current);
    },
    [],
  );

  if (phase === 'intro') {
    return <Intro best={initialBest} onStart={() => { haptic('light'); setPhase('play'); }} />;
  }
  if (phase === 'over') {
    return <GameOver streak={streak} best={best} isRecord={streak > initialBest && streak > 0} onPlayAgain={onPlayAgain} />;
  }

  const showResult = Boolean(answered);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Rapid Fire"
        right={<span className="rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">BEST {best}</span>}
      />

      {/* 5-second timer bar */}
      <div className="h-1.5 w-full bg-court-card">
        {!answered && (
          <motion.div
            key={qIndex}
            className="h-full bg-flame"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: QUESTION_MS / 1000, ease: 'linear' }}
          />
        )}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 safe-b">
        {/* Streak */}
        <div className="flex flex-col items-center pt-5">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={streak}
              initial={{ scale: 0.4, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="font-display text-6xl leading-none tracking-wide text-flame"
            >
              {streak}
            </motion.div>
          </AnimatePresence>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-ink-muted">Streak</div>
        </div>

        {/* Prompt */}
        <div className="mt-4 text-center">
          <div className="font-display text-5xl tracking-wide">{q.season}</div>
          <div className="mt-0.5 text-xs uppercase tracking-wider text-ink-secondary">{q.round} · Who advanced?</div>
        </div>

        {/* Team choices */}
        <div className="mt-5 flex flex-1 flex-col justify-center gap-3 pb-6">
          <TeamChoice team={q.left} answered={answered} winner={q.winner} onPick={pick} />
          <div className="text-center font-display text-xl tracking-widest text-ink-muted">VS</div>
          <TeamChoice team={q.right} answered={answered} winner={q.winner} onPick={pick} />

          <div className="h-6 text-center">
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-sm font-bold ${answered!.correct ? 'text-win' : 'text-miss'}`}
                >
                  {answered!.correct ? '+1' : `${shortName(q.winner)} won ${q.result}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamChoice({
  team,
  answered,
  winner,
  onPick,
}: {
  team: string;
  answered: Answered | null;
  winner: string;
  onPick: (team: string) => void;
}) {
  const style = teamStyle(team);
  const isWinner = team === winner;
  const isPick = answered?.pick === team;

  let ring = 'ring-line-strong';
  let flash: string | undefined;
  if (answered) {
    if (isWinner) {
      ring = 'ring-win';
      flash = 'rgba(34,197,94,0.16)';
    } else if (isPick) {
      ring = 'ring-miss';
      flash = 'rgba(239,68,68,0.16)';
    } else {
      ring = 'ring-line-subtle';
    }
  }

  return (
    <motion.button
      type="button"
      disabled={Boolean(answered)}
      onClick={() => onPick(team)}
      whileTap={answered ? undefined : { scale: 0.97 }}
      animate={answered && isWinner ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`no-select relative flex items-center gap-4 overflow-hidden rounded-3xl bg-court-elevated p-4 text-left ring-2 ${ring} ${answered && !isWinner && !isPick ? 'opacity-45' : ''}`}
      style={{ borderLeft: `6px solid ${style.primary}`, backgroundColor: flash }}
    >
      <TeamLogo team={team} size={52} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-3xl tracking-wide">{shortName(team)}</div>
        <div className="truncate text-xs text-ink-muted">{team}</div>
      </div>
      {answered && (isWinner || isPick) && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
          className={`text-3xl ${isWinner ? 'text-win' : 'text-miss'}`}
        >
          {isWinner ? '✓' : '✗'}
        </motion.span>
      )}
    </motion.button>
  );
}

function Intro({ best, onStart }: { best: number; onStart: () => void }) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Rapid Fire" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-flame/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">Survival</div>
          <div className="mt-4 font-display text-7xl leading-none tracking-wide text-flame">RAPID FIRE</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          Two teams, one real playoff series. Tap who advanced before the clock hits zero. One miss ends the run — how long can your streak go?
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-court-card px-3 py-1.5 text-sm font-bold text-miss">⏱ 5 seconds per pick</div>
        {best > 0 && <p className="mt-2 text-xs text-ink-muted">Best streak: {best}</p>}
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Start →
        </button>
      </div>
    </div>
  );
}

function GameOver({ streak, best, isRecord, onPlayAgain }: { streak: number; best: number; isRecord: boolean; onPlayAgain: () => void }) {
  const animated = useCountUp(streak);
  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={isRecord} />
      <TopBar title="Run Over" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-10 text-center safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-7 ring-1 ring-line-strong"
        >
          {isRecord && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">🔥 New record</div>
          )}
          <div className="font-display text-8xl leading-none tracking-wide text-flame">{animated}</div>
          <div className="mt-1 text-ink-secondary">correct in a row</div>
          <div className="mt-4 text-sm text-ink-muted">Best streak · {best}</div>
        </motion.div>

        <div className="mt-6 flex w-full gap-3">
          <button type="button" onClick={onPlayAgain} className="no-select flex-1 rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
