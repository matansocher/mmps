import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { League } from '../types';
import { seasonsForSelection, flattenSeason, leagueOf } from '../lib/playoffs';
import { loadProfile, recordChump, statsFor } from '../lib/storage';
import { selectionMeta, type LeagueSelection } from '../lib/leagues';
import { haptic } from '../lib/haptics';
import { teamStyle, shortName } from '../lib/teams';
import { useCountUp } from '../lib/useCountUp';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';

const QUESTION_MS = 5000;
const CORRECT_DELAY = 460;
const REVEAL_DELAY = 1150;
const LIVES = 3;

// A single team + year card. `isChampion` is the truth; the player swipes YES / NO.
type Prompt = {
  readonly id: string;
  readonly league: League;
  readonly season: number;
  readonly team: string;
  readonly isChampion: boolean;
  readonly champion: string;
};

type Answered = { readonly said: boolean | null; readonly correct: boolean };
type Phase = 'intro' | 'play' | 'over';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// For each season, build one true prompt (the champion) and one decoy prompt (a plausible
// non-champion that actually reached that year's bracket — often the runner-up). ~50/50 split.
function buildDeck(sel: LeagueSelection): Prompt[] {
  const out: Prompt[] = [];
  for (const season of seasonsForSelection(sel)) {
    const lg = leagueOf(season);
    const champion = season.champion;

    const participants = new Set<string>();
    for (const s of flattenSeason(season)) {
      participants.add(s.higherSeed.team);
      participants.add(s.lowerSeed.team);
    }
    participants.delete(champion);
    const decoyPool = participants.size > 0 ? [...participants] : [season.runnerUp].filter(Boolean);

    out.push({
      id: `${lg}-${season.season}-yes`,
      league: lg,
      season: season.season,
      team: champion,
      isChampion: true,
      champion,
    });

    if (decoyPool.length > 0) {
      const decoy = decoyPool[Math.floor(Math.random() * decoyPool.length)];
      out.push({
        id: `${lg}-${season.season}-no`,
        league: lg,
        season: season.season,
        team: decoy,
        isChampion: false,
        champion,
      });
    }
  }
  return shuffle(out);
}

export function ChampionOrChump({ league }: { league: LeagueSelection }) {
  const [seed, setSeed] = useState(0);
  return <Run key={seed} sel={league} onPlayAgain={() => setSeed((s) => s + 1)} />;
}

function Run({ sel, onPlayAgain }: { sel: LeagueSelection; onPlayAgain: () => void }) {
  const deck = useMemo(() => buildDeck(sel), [sel]);
  const initialBest = useMemo(() => statsFor(loadProfile(), sel).bestChumpStreak, [sel]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [answered, setAnswered] = useState<Answered | null>(null);

  const clockRef = useRef<number[]>([]);
  const flowRef = useRef<number | null>(null);
  const recorded = useRef(false);

  const q = deck[qIndex % deck.length];
  const best = Math.max(initialBest, longest);

  function clearClock() {
    clockRef.current.forEach((t) => window.clearTimeout(t));
    clockRef.current = [];
  }

  function endRun(finalLongest: number) {
    if (!recorded.current) {
      recorded.current = true;
      recordChump(sel, finalLongest);
    }
    setPhase('over');
  }

  function next() {
    setAnswered(null);
    setQIndex((i) => i + 1);
  }

  function resolveWrong() {
    const remaining = lives - 1;
    setLives(remaining);
    setStreak(0);
    if (remaining <= 0) {
      flowRef.current = window.setTimeout(() => endRun(longest), REVEAL_DELAY);
    } else {
      flowRef.current = window.setTimeout(next, REVEAL_DELAY);
    }
  }

  function answer(said: boolean) {
    if (answered) return;
    clearClock();
    const correct = said === q.isChampion;
    setAnswered({ said, correct });
    if (correct) {
      haptic('success');
      setStreak((s) => {
        const ns = s + 1;
        setLongest((l) => Math.max(l, ns));
        return ns;
      });
      flowRef.current = window.setTimeout(next, CORRECT_DELAY);
    } else {
      haptic('error');
      resolveWrong();
    }
  }

  function timeout() {
    if (answered) return;
    clearClock();
    haptic('error');
    setAnswered({ said: null, correct: false });
    resolveWrong();
  }

  // Per-card countdown; running out counts as a miss.
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
    return <GameOver longest={longest} best={best} isRecord={longest > initialBest && longest > 0} onPlayAgain={onPlayAgain} />;
  }

  const style = teamStyle(q.league, q.team);
  const showResult = Boolean(answered);
  let cardFlash: string | undefined;
  if (answered) cardFlash = answered.correct ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)';

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Champion or Chump?"
        right={<span className="rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">BEST {best}</span>}
      />

      {/* Countdown bar */}
      <div className="h-1.5 w-full bg-court-card">
        {!answered && (
          <motion.div
            key={qIndex}
            className="h-full bg-win"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: QUESTION_MS / 1000, ease: 'linear' }}
          />
        )}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 safe-b">
        {/* Streak + lives */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-baseline gap-2">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={streak}
                initial={{ scale: 0.4, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="font-display text-4xl leading-none tracking-wide text-win"
              >
                {streak}
              </motion.span>
            </AnimatePresence>
            <span className="text-[11px] uppercase tracking-widest text-ink-muted">Streak</span>
          </div>
          <div className="flex gap-1 text-2xl leading-none">
            {Array.from({ length: LIVES }).map((_, i) => (
              <span key={i} className={i < lives ? '' : 'opacity-25 grayscale'}>❤️</span>
            ))}
          </div>
        </div>

        {/* The card */}
        <div className="mt-3 flex flex-1 flex-col justify-center pb-4">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={q.id + qIndex}
              initial={{ scale: 0.9, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -18 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative flex flex-col items-center gap-4 overflow-hidden rounded-[2rem] bg-court-elevated p-8 text-center ring-2 ring-line-strong"
              style={{ borderTop: `6px solid ${style.primary}`, backgroundColor: cardFlash }}
            >
              <div className="text-xs uppercase tracking-widest text-ink-muted">{selectionMeta(sel).emoji === '🌐' ? `${leagueBadge(q.league)} · ` : ''}Champions?</div>
              <TeamLogo league={q.league} team={q.team} size={104} />
              <div className="font-display text-4xl leading-none tracking-wide">{shortName(q.league, q.team)}</div>
              <div className="font-display text-7xl leading-none tracking-wide" style={{ color: style.primary }}>{q.season}</div>

              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-bold ${answered.correct ? 'text-win' : 'text-miss'}`}
                >
                  {answered.correct
                    ? q.isChampion ? '✓ Champions' : '✓ Not the champs'
                    : q.isChampion
                      ? `✗ They lifted it — ${q.season}`
                      : `✗ ${shortName(q.league, q.champion)} won ${q.season}`}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* YES / NO */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <SwipeButton kind="no" answered={answered} truth={q.isChampion} onPick={() => answer(false)} />
          <SwipeButton kind="yes" answered={answered} truth={q.isChampion} onPick={() => answer(true)} />
        </div>
        {!showResult && <div className="pb-2 text-center text-[11px] uppercase tracking-widest text-ink-muted">⏱ tap fast</div>}
      </div>
    </div>
  );
}

function leagueBadge(league: League): string {
  return selectionMeta(league).emoji + ' ' + selectionMeta(league).short;
}

function SwipeButton({
  kind,
  answered,
  truth,
  onPick,
}: {
  kind: 'yes' | 'no';
  answered: Answered | null;
  truth: boolean;
  onPick: () => void;
}) {
  const isYes = kind === 'yes';
  const said = isYes;
  const wouldBeCorrect = said === truth;

  let cls = isYes ? 'bg-win text-court-base' : 'bg-court-elevated text-miss ring-2 ring-miss/50';
  if (answered) {
    if (wouldBeCorrect) {
      cls = 'bg-win text-court-base';
    } else if (answered.said === said) {
      cls = 'bg-miss text-white';
    } else {
      cls = 'bg-court-card text-ink-muted opacity-45';
    }
  }

  return (
    <motion.button
      type="button"
      disabled={Boolean(answered)}
      onClick={onPick}
      whileTap={answered ? undefined : { scale: 0.96 }}
      className={`no-select flex items-center justify-center gap-2 rounded-2xl py-5 font-display text-3xl tracking-wide ${cls}`}
    >
      {isYes ? '✓ YES' : '✗ NO'}
    </motion.button>
  );
}

function Intro({ sel, best, onStart }: { sel: LeagueSelection; best: number; onStart: () => void }) {
  const meta = selectionMeta(sel);
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Champion or Chump?" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">{meta.emoji} {meta.short} · Quick Win</div>
          <div className="mt-4 font-display text-6xl leading-none tracking-wide text-win">🃏 CHAMP OR CHUMP?</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          A team and a year flash up. Did they lift the trophy that season? Tap <span className="font-bold text-win">YES</span> or <span className="font-bold text-miss">NO</span> before the clock runs out.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-court-card px-3 py-1.5 text-sm font-bold text-miss">❤️❤️❤️ 3 lives · ⏱ 5s each</div>
        {best > 0 && <p className="mt-2 text-xs text-ink-muted">Best streak: {best}</p>}
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-win py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Start →
        </button>
      </div>
    </div>
  );
}

function GameOver({ longest, best, isRecord, onPlayAgain }: { longest: number; best: number; isRecord: boolean; onPlayAgain: () => void }) {
  const animated = useCountUp(longest);
  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={isRecord} />
      <TopBar title="Run Over" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-10 text-center safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="w-full overflow-hidden rounded-3xl bg-gradient-to-br from-win/25 to-court-card p-7 ring-1 ring-line-strong"
        >
          {isRecord && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">🔥 New record</div>
          )}
          <div className="font-display text-8xl leading-none tracking-wide text-win">{animated}</div>
          <div className="mt-1 text-ink-secondary">longest streak</div>
          <div className="mt-4 text-sm text-ink-muted">Best streak · {best}</div>
        </motion.div>

        <div className="mt-6 flex w-full gap-3">
          <button type="button" onClick={onPlayAgain} className="no-select flex-1 rounded-2xl bg-win py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
