import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { League } from '../types';
import { seasonsForSelection, leagueOf } from '../lib/playoffs';
import { loadProfile, recordLifted, statsFor } from '../lib/storage';
import { selectionMeta, type LeagueSelection } from '../lib/leagues';
import { haptic } from '../lib/haptics';
import { shortName } from '../lib/teams';
import { useCountUp } from '../lib/useCountUp';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';

const CORRECT_DELAY = 520;
const REVEAL_DELAY = 1250;
const QUESTION_MS = 5000;

type Question = {
  readonly id: string;
  readonly league: League;
  readonly season: number;
  readonly champion: string;
  readonly options: readonly string[];
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

// One question per season: pick that year's champion out of 4 real champions from the
// same tournament (so decoys stay plausible even in the All-Sports mix).
function buildDeck(sel: LeagueSelection): Question[] {
  const seasons = seasonsForSelection(sel);
  const championsByLeague = new Map<League, string[]>();
  for (const s of seasons) {
    const lg = leagueOf(s);
    const list = championsByLeague.get(lg) ?? [];
    if (!list.includes(s.champion)) list.push(s.champion);
    championsByLeague.set(lg, list);
  }
  const out = seasons.map((s) => {
    const lg = leagueOf(s);
    const pool = championsByLeague.get(lg) ?? [];
    const decoys = shuffle(pool.filter((c) => c !== s.champion)).slice(0, 3);
    return {
      id: `${lg}-${s.season}-${s.champion}`,
      league: lg,
      season: s.season,
      champion: s.champion,
      options: shuffle([s.champion, ...decoys]),
    };
  });
  return shuffle(out);
}

export function WhoLifted({ league }: { league: LeagueSelection }) {
  const [seed, setSeed] = useState(0);
  return <Run key={seed} sel={league} onPlayAgain={() => setSeed((s) => s + 1)} />;
}

function Run({ sel, onPlayAgain }: { sel: LeagueSelection; onPlayAgain: () => void }) {
  const deck = useMemo(() => buildDeck(sel), [sel]);
  const initialBest = useMemo(() => statsFor(loadProfile(), sel).bestLiftedStreak, [sel]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);

  const flowRef = useRef<number | null>(null);
  const clockRef = useRef<number[]>([]);
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
      recordLifted(sel, finalStreak);
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
    const correct = team === q.champion;
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
    return <Intro sel={sel} best={initialBest} onStart={() => { haptic('light'); setPhase('play'); }} />;
  }
  if (phase === 'over') {
    return <GameOver streak={streak} best={best} isRecord={streak > initialBest && streak > 0} onPlayAgain={onPlayAgain} />;
  }

  const meta = selectionMeta(sel);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Who Lifted It?"
        right={<span className="rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">BEST {best}</span>}
      />

      {/* 5-second timer bar */}
      <div className="h-1.5 w-full bg-court-card">
        {!answered && (
          <motion.div
            key={qIndex}
            className="h-full bg-hoop"
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
              className="font-display text-6xl leading-none tracking-wide text-hoop"
            >
              {streak}
            </motion.div>
          </AnimatePresence>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-ink-muted">Streak</div>
        </div>

        {/* Prompt */}
        <div className="mt-4 text-center">
          <div className="text-xs uppercase tracking-wider text-ink-secondary">{meta.emoji} {meta.short} · Who was champion?</div>
          <div className="font-display text-7xl leading-none tracking-wide">{q.season}</div>
        </div>

        {/* Champion choices — 2×2 grid of logos */}
        <div className="mt-6 grid flex-1 grid-cols-2 content-center gap-3 pb-6">
          {q.options.map((team) => (
            <ChampionChoice key={team} league={q.league} team={team} answered={answered} champion={q.champion} onPick={pick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChampionChoice({
  league,
  team,
  answered,
  champion,
  onPick,
}: {
  league: League;
  team: string;
  answered: Answered | null;
  champion: string;
  onPick: (team: string) => void;
}) {
  const isChamp = team === champion;
  const isPick = answered?.pick === team;

  let ring = 'ring-line-strong';
  let flash: string | undefined;
  let dim = '';
  if (answered) {
    if (isChamp) {
      ring = 'ring-win';
      flash = 'rgba(34,197,94,0.16)';
    } else if (isPick) {
      ring = 'ring-miss';
      flash = 'rgba(239,68,68,0.16)';
    } else {
      ring = 'ring-line-subtle';
      dim = 'opacity-45';
    }
  }

  return (
    <motion.button
      type="button"
      disabled={Boolean(answered)}
      onClick={() => onPick(team)}
      whileTap={answered ? undefined : { scale: 0.96 }}
      animate={answered && isChamp ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`no-select relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-court-elevated p-3 text-center ring-2 ${ring} ${dim}`}
      style={{ backgroundColor: flash }}
    >
      <TeamLogo league={league} team={team} size={64} />
      <div className="w-full truncate font-display text-xl tracking-wide leading-none">{shortName(league, team)}</div>
      {answered && (isChamp || isPick) && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
          className={`absolute right-2 top-2 text-2xl ${isChamp ? 'text-win' : 'text-miss'}`}
        >
          {isChamp ? '✓' : '✗'}
        </motion.span>
      )}
    </motion.button>
  );
}

function Intro({ sel, best, onStart }: { sel: LeagueSelection; best: number; onStart: () => void }) {
  const meta = selectionMeta(sel);
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Who Lifted It?" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-hoop/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-hoop">{meta.emoji} {meta.short} · Trivia</div>
          <div className="mt-4 font-display text-6xl leading-none tracking-wide text-hoop">WHO LIFTED IT?</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          A year appears. Tap the team that lifted the trophy that season — you've got <strong className="text-ink-primary">5 seconds</strong> a pick. One wrong or too-slow answer ends the run. How many can you name in a row?
        </p>
        {best > 0 && <p className="mt-3 text-xs text-ink-muted">Best streak: {best}</p>}
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-hoop py-4 font-display text-2xl tracking-wide text-white active:scale-[0.98]">
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
          className="w-full overflow-hidden rounded-3xl bg-gradient-to-br from-hoop/25 to-court-card p-7 ring-1 ring-line-strong"
        >
          {isRecord && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">🔥 New record</div>
          )}
          <div className="font-display text-8xl leading-none tracking-wide text-hoop">{animated}</div>
          <div className="mt-1 text-ink-secondary">champions in a row</div>
          <div className="mt-4 text-sm text-ink-muted">Best streak · {best}</div>
        </motion.div>

        <div className="mt-6 flex w-full gap-3">
          <button type="button" onClick={onPlayAgain} className="no-select flex-1 rounded-2xl bg-hoop py-4 font-display text-2xl tracking-wide text-white active:scale-[0.98]">
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
