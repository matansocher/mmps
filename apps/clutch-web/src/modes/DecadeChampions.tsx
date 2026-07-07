import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import type { League } from '../types';
import { seasonsFor } from '../lib/playoffs';
import { recordDecade, loadProfile, statsFor } from '../lib/storage';
import { leagueConfig } from '../lib/leagues';
import { haptic } from '../lib/haptics';
import { teamStyle, shortName } from '../lib/teams';
import { useCountUp } from '../lib/useCountUp';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';

const WINDOW = 10;
const ROUND_SECONDS = 30;

type Chip = { readonly id: string; readonly team: string };
type Phase = 'intro' | 'play' | 'result';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DecadeChampions({ league }: { league: League }) {
  const [seed, setSeed] = useState(0);
  return <Round key={seed} league={league} onPlayAgain={() => setSeed((s) => s + 1)} />;
}

function Round({ league, onPlayAgain }: { league: League; onPlayAgain: () => void }) {
  // A window of WINDOW consecutive tournaments (by index, not calendar year) so leagues
  // played every few years (World Cup / Euros) work the same as yearly ones (NBA / UCL).
  const windowSeasons = useMemo(() => {
    const all = seasonsFor(league);
    const start = Math.floor(Math.random() * (all.length - WINDOW + 1));
    return all.slice(start, start + WINDOW);
  }, [league]);
  const years = useMemo(() => windowSeasons.map((s) => s.season), [windowSeasons]);
  const answer = useMemo(() => windowSeasons.map((s) => s.champion), [windowSeasons]);
  const startYear = years[0];
  const endYear = years[years.length - 1];

  const initial = useMemo<Chip[]>(() => {
    const base: Chip[] = answer.map((team, i) => ({ id: `c${i}`, team }));
    let s = shuffle(base);
    // Avoid gifting a fully-correct board on the very first shuffle.
    if (s.every((c, i) => c.team === answer[i])) s = shuffle(base);
    return s;
  }, [answer]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [order, setOrder] = useState<Chip[]>(initial);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const submitted = useRef(false);

  const [finalScore, setFinalScore] = useState(0);

  function doSubmit(byTimeout: boolean) {
    if (submitted.current) return;
    submitted.current = true;
    const s = order.reduce((n, c, i) => n + (c.team === answer[i] ? 1 : 0), 0);
    setFinalScore(s);
    setTimedOut(byTimeout);
    recordDecade(league, s);
    haptic(byTimeout ? 'error' : 'heavy');
    setPhase('result');
  }

  // 30-second countdown.
  useEffect(() => {
    if (phase !== 'play') return;
    if (secondsLeft <= 0) {
      doSubmit(true);
      return;
    }
    if (secondsLeft <= 5) haptic('light');
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  if (phase === 'intro') {
    return <Intro league={league} startYear={startYear} endYear={endYear} best={statsFor(loadProfile(), league).bestDecadeScore} onStart={() => { haptic('light'); setPhase('play'); }} />;
  }
  if (phase === 'result') {
    return <Result league={league} startYear={startYear} endYear={endYear} years={years} answer={answer} order={order} score={finalScore} timedOut={timedOut} onPlayAgain={onPlayAgain} />;
  }

  const danger = secondsLeft <= 6;
  const warn = secondsLeft <= 12;
  const barColor = danger ? '#EF4444' : warn ? '#FBBF24' : '#F97316';

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={`${startYear}–${endYear}`}
        right={
          <motion.span
            key={secondsLeft}
            initial={{ scale: danger ? 1.3 : 1 }}
            animate={{ scale: 1 }}
            className="min-w-[52px] rounded-lg px-2 py-1 text-center text-sm font-bold"
            style={{ backgroundColor: `${barColor}22`, color: barColor }}
          >
            0:{String(secondsLeft).padStart(2, '0')}
          </motion.span>
        }
      />

      <div className="h-1.5 w-full bg-court-card">
        <motion.div className="h-full" style={{ backgroundColor: barColor }} animate={{ width: `${(secondsLeft / ROUND_SECONDS) * 100}%` }} transition={{ ease: 'linear', duration: 1 }} />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-3 safe-b">
        <p className="mb-2 text-center text-xs text-ink-secondary">Drag the champions so each lines up with its title year</p>

        <div className="flex gap-2">
          {/* Fixed year column */}
          <div className="flex flex-col gap-2">
            {years.map((y, i) => {
              const correct = phase === 'play' ? false : order[i]?.team === answer[i];
              return (
                <div key={y} className={`flex h-12 w-14 items-center justify-center rounded-xl font-display text-xl tracking-wide ${correct ? 'bg-win/15 text-win' : 'bg-court-card text-ink-secondary'}`}>
                  {`'${String(y).slice(2)}`}
                </div>
              );
            })}
          </div>

          {/* Draggable champions */}
          <Reorder.Group axis="y" values={order} onReorder={setOrder} className="flex flex-1 flex-col gap-2">
            {order.map((chip) => (
              <ChampRow key={chip.id} league={league} chip={chip} />
            ))}
          </Reorder.Group>
        </div>

        <div className="mt-auto py-4">
          <button type="button" onClick={() => doSubmit(false)} className="no-select w-full rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
            Submit Order
          </button>
        </div>
      </div>
    </div>
  );
}

function ChampRow({ league, chip }: { league: League; chip: Chip }) {
  const controls = useDragControls();
  const style = teamStyle(league, chip.team);
  return (
    <Reorder.Item
      value={chip}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.04, boxShadow: '0 12px 30px rgba(0,0,0,0.55)', zIndex: 20 }}
      className="flex h-12 select-none items-center gap-2 rounded-xl bg-court-elevated px-2 ring-1 ring-line-subtle"
      style={{ borderLeft: `4px solid ${style.primary}` }}
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-ink-muted active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="3" r="1.4" /><circle cx="10" cy="3" r="1.4" />
          <circle cx="4" cy="8" r="1.4" /><circle cx="10" cy="8" r="1.4" />
          <circle cx="4" cy="13" r="1.4" /><circle cx="10" cy="13" r="1.4" />
        </svg>
      </button>
      <TeamLogo league={league} team={chip.team} size={28} />
      <span className="flex-1 truncate text-sm font-semibold">{shortName(league, chip.team)}</span>
    </Reorder.Item>
  );
}

function Intro({ league, startYear, endYear, best, onStart }: { league: League; startYear: number; endYear: number; best: number; onStart: () => void }) {
  const cfg = leagueConfig(league);
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Decade Champions" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-flame/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame">{cfg.emoji} {cfg.short} · Title Ladder</div>
          <div className="mt-4 font-display text-7xl leading-none tracking-wide text-flame">{startYear}–{endYear}</div>
          <div className="mt-2 font-display text-3xl tracking-wide">Order the champions</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          Ten teams, ten title years. Drag each champion into the year they won it — top to bottom, {startYear}–{endYear}. Watch out: a team can repeat.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-court-card px-3 py-1.5 text-sm font-bold text-miss">
          ⏱ {ROUND_SECONDS}s on the clock
        </div>
        {best > 0 && <p className="mt-2 text-xs text-ink-muted">Personal best: {best}/10</p>}
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Start →
        </button>
      </div>
    </div>
  );
}

function Result({
  league,
  startYear,
  endYear,
  years,
  answer,
  order,
  score,
  timedOut,
  onPlayAgain,
}: {
  league: League;
  startYear: number;
  endYear: number;
  years: number[];
  answer: string[];
  order: Chip[];
  score: number;
  timedOut: boolean;
  onPlayAgain: () => void;
}) {
  const animated = useCountUp(score);
  const perfect = score === 10;
  const celebrate = score >= 7;

  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={celebrate} />
      <TopBar title={`${startYear}–${endYear}`} />
      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6 safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-6 text-center ring-1 ring-line-strong"
        >
          {timedOut && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-miss/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-miss">⏱ Time’s up</div>
          )}
          <div className="font-display text-7xl leading-none tracking-wide text-flame">
            {animated}
            <span className="text-2xl text-ink-secondary">/10</span>
          </div>
          <p className="mt-1 text-ink-secondary">{perfect ? 'Flawless ladder!' : `${score} champions in the right year`}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onPlayAgain} className="no-select flex-1 rounded-2xl bg-flame py-3 font-display text-xl tracking-wide text-court-base active:scale-[0.98]">
              Play again
            </button>
          </div>
        </motion.div>

        <div className="mt-6 space-y-2">
          {years.map((y, i) => {
            const picked = order[i]?.team;
            const correct = picked === answer[i];
            return (
              <motion.div
                key={y}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                className={`flex items-center gap-3 rounded-2xl bg-court-card p-2.5 ring-1 ${correct ? 'ring-win/40' : 'ring-miss/40'}`}
              >
                <span className="w-12 shrink-0 text-center font-display text-2xl tracking-wide text-ink-secondary">{`'${String(y).slice(2)}`}</span>
                <TeamLogo league={league} team={answer[i]} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{shortName(league, answer[i])}</div>
                  {!correct && <div className="truncate text-[11px] text-miss">you placed {picked ? shortName(league, picked) : '—'}</div>}
                </div>
                <span className={`text-lg ${correct ? 'text-win' : 'text-miss'}`}>{correct ? '✓' : '✗'}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
