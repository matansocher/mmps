import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { League } from '../types';
import { dailyClutchQuestions, dayNumber, msUntilNextDay, DAILY_QUESTION_COUNT, type DailyQuestion } from '../lib/daily';
import { loadProfile, dailyClutchToday, liveDailyStreak, recordDailyClutch, type DailyClutchResult } from '../lib/storage';
import { buildDailyClutchShareText, shareOrCopy } from '../lib/share';
import { trackGameStart, track, trackShare } from '../lib/analytics';
import { leagueConfig } from '../lib/leagues';
import { shortName } from '../lib/teams';
import { haptic } from '../lib/haptics';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';
import { StreakBadge } from '../components/StreakBadge';

const CORRECT_DELAY = 620;
const REVEAL_DELAY = 1050;

type Answered = { readonly pick: string; readonly correct: boolean };
type Phase = 'intro' | 'play' | 'done';

type Outcome = {
  readonly result: DailyClutchResult;
  readonly streak: number;
  readonly isRecord: boolean;
};

export function ClutchDaily() {
  const today = useMemo(() => new Date(), []);
  const questions = useMemo(() => dailyClutchQuestions(today), [today]);
  const dayNum = dayNumber(today);

  const existing = useMemo(() => dailyClutchToday(loadProfile(), today), [today]);
  const [phase, setPhase] = useState<Phase>(existing ? 'done' : 'intro');
  const [outcome, setOutcome] = useState<Outcome | null>(
    existing ? { result: existing, streak: liveDailyStreak(loadProfile(), today), isRecord: false } : null,
  );

  const initialStreak = useMemo(() => liveDailyStreak(loadProfile(), today), [today]);

  function finish(flags: boolean[]) {
    const leagues = questions.map((q) => q.league);
    const correct = flags.filter(Boolean).length;
    const result: DailyClutchResult = { dateKey: '', dayNumber: dayNum, correct, total: questions.length, flags, leagues };
    const bestBefore = loadProfile().daily.bestStreak;
    const p = recordDailyClutch({ ...result, dateKey: keyOf(today) }, today);
    track('daily_completed', { correct, total: questions.length, streak: p.daily.currentStreak, isRecord: p.daily.currentStreak > bestBefore && p.daily.currentStreak > 0 });
    setOutcome({ result, streak: p.daily.currentStreak, isRecord: p.daily.currentStreak > bestBefore && p.daily.currentStreak > 0 });
    setPhase('done');
  }

  if (phase === 'intro') {
    return <Intro dayNum={dayNum} streak={initialStreak} onStart={() => { haptic('light'); trackGameStart('clutch-daily'); setPhase('play'); }} />;
  }
  if (phase === 'done' && outcome) {
    return <Result dayNum={dayNum} outcome={outcome} />;
  }
  return <Play questions={questions} dayNum={dayNum} onFinish={finish} />;
}

function keyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function Play({ questions, dayNum, onFinish }: { questions: readonly DailyQuestion[]; dayNum: number; onFinish: (flags: boolean[]) => void }) {
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const flags = useRef<boolean[]>([]);
  const flowRef = useRef<number | null>(null);

  const q = questions[qIndex];
  const cfg = leagueConfig(q.league);

  useEffect(() => () => { if (flowRef.current) window.clearTimeout(flowRef.current); }, []);

  function pick(team: string) {
    if (answered) return;
    const correct = team === q.champion;
    flags.current.push(correct);
    setAnswered({ pick: team, correct });
    haptic(correct ? 'success' : 'error');
    const last = qIndex === questions.length - 1;
    flowRef.current = window.setTimeout(() => {
      if (last) {
        onFinish(flags.current);
      } else {
        setAnswered(null);
        setQIndex((i) => i + 1);
      }
    }, correct ? CORRECT_DELAY : REVEAL_DELAY);
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Clutch Daily" right={<span className="rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">#{dayNum}</span>} />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 safe-b">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5">
          {questions.map((_, i) => {
            const done = i < qIndex || (i === qIndex && answered);
            const ok = flags.current[i];
            return (
              <span
                key={i}
                className={`h-2.5 rounded-full transition-all ${i === qIndex ? 'w-6' : 'w-2.5'} ${
                  done ? (ok ? 'bg-win' : 'bg-miss') : i === qIndex ? 'bg-flame' : 'bg-court-card'
                }`}
              />
            );
          })}
        </div>
        <div className="mt-1 text-center text-[11px] uppercase tracking-widest text-ink-muted">Question {qIndex + 1} of {questions.length}</div>

        {/* Prompt */}
        <div className="mt-5 text-center">
          <div className="text-xs uppercase tracking-wider text-ink-secondary">{cfg.emoji} {cfg.short} · Who lifted it?</div>
          <div className="font-display text-7xl leading-none tracking-wide">{q.season}</div>
        </div>

        {/* Options */}
        <div className="mt-6 grid flex-1 grid-cols-2 content-center gap-3 pb-6">
          {q.options.map((team) => (
            <Choice key={team} league={q.league} team={team} answered={answered} champion={q.champion} onPick={pick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Choice({
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
      <div className="w-full truncate font-display text-xl leading-none tracking-wide">{shortName(league, team)}</div>
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

function Intro({ dayNum, streak, onStart }: { dayNum: number; streak: number; onStart: () => void }) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Clutch Daily" right={<StreakBadge count={streak} size="sm" />} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-flame/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">Daily #{dayNum}</div>
          <div className="mt-4 font-display text-6xl leading-none tracking-wide text-flame">CLUTCH DAILY</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          Five champions from across every sport — the <strong className="text-ink-primary">same five for everyone</strong>, today only. One shot each. Keep your streak alive.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-court-card px-3 py-1.5 text-sm font-bold text-ink-secondary">🏀 ⚽️ 🌍 🇪🇺 · {DAILY_QUESTION_COUNT} questions</div>
        {streak > 0 && <p className="mt-3 text-xs text-ink-muted">Current streak: 🔥 {streak} {streak === 1 ? 'day' : 'days'}</p>}
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Play today's 5 →
        </button>
      </div>
    </div>
  );
}

function Result({ dayNum, outcome }: { dayNum: number; outcome: Outcome }) {
  const { result, streak, isRecord } = outcome;
  const perfect = result.correct === result.total;
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(msUntilNextDay());

  useEffect(() => {
    const t = window.setInterval(() => setRemaining(msUntilNextDay()), 1000);
    return () => window.clearInterval(t);
  }, []);

  async function onShare() {
    trackShare('clutch-daily');
    const text = buildDailyClutchShareText(dayNum, result.correct, result.total, result.flags, result.leagues, streak);
    const res = await shareOrCopy(text);
    setShareMsg(res === 'copied' ? 'Copied to clipboard!' : res === 'shared' ? 'Shared!' : 'Could not share');
  }

  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={perfect || isRecord} />
      <TopBar title={`Daily #${dayNum}`} right={<StreakBadge count={streak} size="sm" />} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-10 text-center safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-7 ring-1 ring-line-strong"
        >
          {isRecord && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">🔥 Longest streak yet</div>
          )}
          <div className="font-display text-8xl leading-none tracking-wide text-flame">{result.correct}<span className="text-4xl text-ink-muted">/{result.total}</span></div>
          <div className="mt-1 text-ink-secondary">{perfect ? 'Perfect — flawless day! 🏆' : 'today’s Clutch Daily'}</div>

          {/* Spoiler-free grid */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {result.flags.map((ok, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xl leading-none">{leagueConfig(result.leagues[i]).emoji}</span>
                <span className={`text-lg leading-none ${ok ? 'text-win' : 'text-miss'}`}>{ok ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-1 text-sm font-bold text-flame">🔥 {streak} day{streak === 1 ? '' : 's'} in a row</div>
        </motion.div>

        <button type="button" onClick={onShare} className="no-select mt-6 w-full rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Share result
        </button>
        <div className="h-5 pt-2 text-sm text-win">{shareMsg}</div>

        <div className="mt-4 rounded-2xl bg-court-card px-5 py-3 text-sm text-ink-secondary">
          Next Clutch in <span className="font-bold text-ink-primary">{formatCountdown(remaining)}</span>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}
