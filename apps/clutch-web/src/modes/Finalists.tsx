import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { League } from '../types';
import { seasonsForSelection, leagueOf } from '../lib/playoffs';
import { loadProfile, recordFinalists, statsFor } from '../lib/storage';
import { selectionMeta, type LeagueSelection } from '../lib/leagues';
import { trackGameStart, trackGameEnd } from '../lib/analytics';
import { haptic } from '../lib/haptics';
import { shortName } from '../lib/teams';
import { useCountUp } from '../lib/useCountUp';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';

const ROUNDS = 10;
const MAX_SCORE = ROUNDS * 2;
const MISS_DELAY = 1700;
const WINNER_DELAY = 1350;

type RoundQ = {
  readonly league: League;
  readonly season: number;
  readonly champion: string;
  readonly runnerUp: string;
  readonly options: readonly string[]; // 6 logos
};

type Outcome = 'miss' | 'good' | 'great';
type Stage = 'select' | 'winner' | 'reveal';
type Phase = 'intro' | 'play' | 'over';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 10 random finals; each round shows the 2 real finalists among 6 finalist-caliber teams
// drawn from the same tournament (so decoys stay plausible even in the All-Sports mix).
function buildRounds(sel: LeagueSelection): RoundQ[] {
  const seasons = seasonsForSelection(sel);
  const finalistsByLeague = new Map<League, string[]>();
  for (const s of seasons) {
    const lg = leagueOf(s);
    const list = finalistsByLeague.get(lg) ?? [];
    for (const t of [s.champion, s.runnerUp]) if (!list.includes(t)) list.push(t);
    finalistsByLeague.set(lg, list);
  }
  const picked = shuffle(seasons).slice(0, Math.min(ROUNDS, seasons.length));
  return picked.map((s) => {
    const lg = leagueOf(s);
    const pool = finalistsByLeague.get(lg) ?? [];
    const decoys = shuffle(pool.filter((t) => t !== s.champion && t !== s.runnerUp)).slice(0, 4);
    return {
      league: lg,
      season: s.season,
      champion: s.champion,
      runnerUp: s.runnerUp,
      options: shuffle([s.champion, s.runnerUp, ...decoys]),
    };
  });
}

export function Finalists({ league }: { league: LeagueSelection }) {
  const [seed, setSeed] = useState(0);
  return <Run key={seed} sel={league} onPlayAgain={() => setSeed((s) => s + 1)} />;
}

function Run({ sel, onPlayAgain }: { sel: LeagueSelection; onPlayAgain: () => void }) {
  const rounds = useMemo(() => buildRounds(sel), [sel]);
  const initialBest = useMemo(() => statsFor(loadProfile(), sel).bestFinalistsScore, [sel]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>('select');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<Outcome[]>([]);

  const flowRef = useRef<number | null>(null);
  const recorded = useRef(false);

  const q = rounds[index];
  const meta = selectionMeta(sel);

  useEffect(
    () => () => {
      if (flowRef.current) window.clearTimeout(flowRef.current);
    },
    [],
  );

  function commit(nextOutcome: Outcome, gained: number, delay: number) {
    const finalResults = [...results, nextOutcome];
    setOutcome(nextOutcome);
    setStage('reveal');
    setScore((s) => s + gained);
    setResults(finalResults);
    flowRef.current = window.setTimeout(() => advance(finalResults), delay);
  }

  function advance(finalResults: Outcome[]) {
    if (index + 1 >= rounds.length) {
      const total = finalResults.reduce((sum, o) => sum + (o === 'great' ? 2 : o === 'good' ? 1 : 0), 0);
      if (!recorded.current) {
        recorded.current = true;
        recordFinalists(sel, total);
        trackGameEnd('finalists', sel, { score: total, rounds: rounds.length, isRecord: total > initialBest && total > 0 });
      }
      setPhase('over');
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setStage('select');
    setOutcome(null);
  }

  function toggle(team: string) {
    if (stage !== 'select') return;
    haptic('light');
    setSelected((cur) => (cur.includes(team) ? cur.filter((t) => t !== team) : cur.length < 2 ? [...cur, team] : cur));
  }

  function confirm() {
    if (stage !== 'select' || selected.length !== 2) return;
    const bothRight = selected.includes(q.champion) && selected.includes(q.runnerUp);
    if (bothRight) {
      haptic('success');
      setStage('winner');
    } else {
      haptic('error');
      commit('miss', 0, MISS_DELAY);
    }
  }

  function pickWinner(team: string) {
    if (stage !== 'winner') return;
    const great = team === q.champion;
    haptic(great ? 'success' : 'light');
    commit(great ? 'great' : 'good', great ? 2 : 1, WINNER_DELAY);
  }

  if (phase === 'intro') {
    return <Intro sel={sel} best={initialBest} onStart={() => { haptic('light'); trackGameStart('finalists', sel); setPhase('play'); }} />;
  }
  if (phase === 'over') {
    return <GameOver score={score} best={Math.max(initialBest, score)} results={results} isRecord={score > initialBest && score > 0} onPlayAgain={onPlayAgain} />;
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Both Finalists"
        right={<span className="rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">{score} / {MAX_SCORE}</span>}
      />

      {/* Round progress */}
      <div className="flex gap-1 px-4 pt-3">
        {rounds.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-flame' : i === index ? 'bg-flame/50' : 'bg-court-card'}`} />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 safe-b">
        {/* Prompt */}
        <div className="mt-4 text-center">
          <div className="text-xs uppercase tracking-wider text-ink-secondary">
            {meta.emoji} {meta.short} · Round {index + 1} of {rounds.length}
          </div>
          <div className="font-display text-7xl leading-none tracking-wide">{q.season}</div>
          <div className="mt-1 text-sm text-ink-secondary">
            {stage === 'winner' ? 'Which one lifted the trophy?' : 'Pick the two teams that reached the final'}
          </div>
        </div>

        {stage === 'winner' ? (
          <div className="mt-6 flex flex-1 flex-col justify-center gap-3 pb-6">
            {selected.map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => pickWinner(team)}
                className="no-select flex items-center gap-4 rounded-3xl bg-court-elevated p-4 text-left ring-2 ring-line-strong transition active:scale-[0.98]"
              >
                <TeamLogo league={q.league} team={team} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-3xl tracking-wide">{shortName(q.league, team)}</div>
                  <div className="truncate text-xs text-ink-muted">{team}</div>
                </div>
                <span className="text-2xl">🏆</span>
              </button>
            ))}
            <p className="text-center text-xs text-ink-muted">Both finalists right! Name the winner for a bonus.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 pb-2">
              {q.options.map((team) => (
                <OptionCard
                  key={team}
                  league={q.league}
                  team={team}
                  stage={stage}
                  selected={selected.includes(team)}
                  isChampion={team === q.champion}
                  isRunnerUp={team === q.runnerUp}
                  onToggle={toggle}
                />
              ))}
            </div>

            <div className="min-h-[64px] pb-4 pt-2">
              <AnimatePresence mode="wait">
                {stage === 'select' ? (
                  <motion.button
                    key="confirm"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    type="button"
                    disabled={selected.length !== 2}
                    onClick={confirm}
                    className={`no-select w-full rounded-2xl py-4 font-display text-2xl tracking-wide transition ${
                      selected.length === 2 ? 'bg-flame text-court-base active:scale-[0.98]' : 'bg-court-card text-ink-muted'
                    }`}
                  >
                    {selected.length === 2 ? 'Confirm →' : `Pick ${2 - selected.length} more`}
                  </motion.button>
                ) : (
                  <motion.div
                    key="outcome"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-center font-display text-3xl tracking-wide ${outcome === 'great' ? 'text-win' : outcome === 'good' ? 'text-hoop' : 'text-miss'}`}
                  >
                    {outcome === 'great' ? 'Great! +2' : outcome === 'good' ? 'Good +1' : 'Missed'}
                    <div className="mt-1 font-sans text-xs text-ink-secondary">
                      {shortName(q.league, q.champion)} beat {shortName(q.league, q.runnerUp)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OptionCard({
  league,
  team,
  stage,
  selected,
  isChampion,
  isRunnerUp,
  onToggle,
}: {
  league: League;
  team: string;
  stage: Stage;
  selected: boolean;
  isChampion: boolean;
  isRunnerUp: boolean;
  onToggle: (team: string) => void;
}) {
  const revealing = stage === 'reveal';
  const isFinalist = isChampion || isRunnerUp;

  let ring = 'ring-line-strong';
  let flash: string | undefined;
  let dim = '';
  if (revealing) {
    if (isChampion) {
      ring = 'ring-win';
      flash = 'rgba(34,197,94,0.16)';
    } else if (isRunnerUp) {
      ring = 'ring-hoop';
      flash = 'rgba(59,130,246,0.14)';
    } else if (selected) {
      ring = 'ring-miss';
      flash = 'rgba(239,68,68,0.16)';
    } else {
      ring = 'ring-line-subtle';
      dim = 'opacity-45';
    }
  } else if (selected) {
    ring = 'ring-flame';
    flash = 'rgba(249,115,22,0.14)';
  }

  return (
    <motion.button
      type="button"
      disabled={revealing}
      onClick={() => onToggle(team)}
      whileTap={revealing ? undefined : { scale: 0.96 }}
      animate={revealing && isChampion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`no-select relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-court-elevated p-3 text-center ring-2 ${ring} ${dim}`}
      style={{ backgroundColor: flash }}
    >
      <TeamLogo league={league} team={team} size={56} />
      <div className="w-full truncate font-display text-lg tracking-wide leading-none">{shortName(league, team)}</div>
      {!revealing && selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-flame text-sm font-bold text-court-base">✓</span>
      )}
      {revealing && isFinalist && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
          className="absolute right-2 top-2 text-2xl"
        >
          {isChampion ? '🏆' : '🥈'}
        </motion.span>
      )}
      {revealing && !isFinalist && selected && (
        <span className="absolute right-2 top-2 text-2xl text-miss">✗</span>
      )}
    </motion.button>
  );
}

function Intro({ sel, best, onStart }: { sel: LeagueSelection; best: number; onStart: () => void }) {
  const meta = selectionMeta(sel);
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Both Finalists" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-flame/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">{meta.emoji} {meta.short} · {ROUNDS} Rounds</div>
          <div className="mt-4 font-display text-6xl leading-none tracking-wide text-flame">BOTH FINALISTS</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          Each round shows a year. Pick <strong className="text-white">both</strong> teams that reached the final, then name the winner for a bonus.
        </p>
        <div className="mt-4 flex gap-2 text-xs">
          <span className="rounded-lg bg-court-card px-3 py-1.5 font-bold text-hoop">Both finalists = +1</span>
          <span className="rounded-lg bg-court-card px-3 py-1.5 font-bold text-win">+ winner = +2</span>
        </div>
        {best > 0 && <p className="mt-3 text-xs text-ink-muted">Best score: {best} / {MAX_SCORE}</p>}
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Start →
        </button>
      </div>
    </div>
  );
}

function GameOver({
  score,
  best,
  results,
  isRecord,
  onPlayAgain,
}: {
  score: number;
  best: number;
  results: readonly Outcome[];
  isRecord: boolean;
  onPlayAgain: () => void;
}) {
  const animated = useCountUp(score);
  const nailed = results.filter((o) => o !== 'miss').length;
  const perfect = results.filter((o) => o === 'great').length;
  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={isRecord} />
      <TopBar title="Round Over" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-10 text-center safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-7 ring-1 ring-line-strong"
        >
          {isRecord && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">🔥 New best</div>
          )}
          <div className="font-display text-8xl leading-none tracking-wide text-flame">
            {animated}
            <span className="text-4xl text-ink-muted"> / {MAX_SCORE}</span>
          </div>
          <div className="mt-3 flex justify-center gap-6 text-sm text-ink-secondary">
            <span>🏆 {perfect} perfect</span>
            <span>✅ {nailed}/{results.length} finals</span>
          </div>
          <div className="mt-4 text-sm text-ink-muted">Best · {best} / {MAX_SCORE}</div>
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
