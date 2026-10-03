import { useEffect, useState } from 'react';
import { CONTINENTS, type GameMode, bestScoreKey, gateFor, questionPool } from '../game/modes';
import { currentStreak, flightNumber, localDay, tierFor } from '../game/progression';
import { readBestScore } from '../hooks/useBestScore';
import { useProgress } from '../store/progress';
import type { Country } from '../types';
import { Icon } from './Icon';
import { SplitFlap } from './SplitFlap';

type Row = {
  readonly mode: GameMode;
  readonly destination: string;
  readonly detail: string;
  readonly status: string;
  readonly tone: 'go' | 'idle' | 'done';
  readonly disabled?: boolean;
};

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const bestStatus = (mode: GameMode, fallback: string) => {
  const best = readBestScore(bestScoreKey(mode));
  return best > 0 ? `Best ${best}` : fallback;
};

const TONES = {
  go: 'bg-[var(--color-signage)] text-[var(--color-ink)]',
  idle: 'text-white/70',
  done: 'text-[var(--color-ok)]',
};

type Props = {
  readonly countries: readonly Country[];
  readonly onPick: (mode: GameMode) => void;
  readonly onPassport: () => void;
};

// The home screen: an airport departures board where every game mode is a flight.
export function DeparturesBoard({ countries, onPick, onPassport }: Props) {
  const progress = useProgress();
  const clock = useClock();
  const today = localDay(new Date());
  const streak = currentStreak(progress, today);
  const { tier, next, progress: toNext } = tierFor(progress.miles);
  const dailyScore = progress.daily[today];
  const stamps = Object.keys(progress.stamps).length;

  const rows: readonly Row[] = [
    dailyScore === undefined
      ? { mode: { kind: 'daily', day: today }, destination: 'Today’s flight', detail: `Flight ${flightNumber(today)} · same 10 countries for everyone · 1.5× miles`, status: 'Boarding', tone: 'go' }
      : { mode: { kind: 'daily', day: today }, destination: 'Today’s flight', detail: 'New flight tomorrow', status: `Landed ${dailyScore}/10`, tone: 'done', disabled: true },
    { mode: { kind: 'classic' }, destination: 'Classic', detail: '10 countries, anywhere on Earth', status: bestStatus({ kind: 'classic' }, 'On time'), tone: 'idle' },
    { mode: { kind: 'name-it' }, destination: 'Name it', detail: 'Pick the lit-up country from 4 nearby names', status: bestStatus({ kind: 'name-it' }, 'On time'), tone: 'idle' },
    ...CONTINENTS.map((continent): Row => {
      const mode: GameMode = { kind: 'continent', continent };
      return { mode, destination: continent, detail: `${questionPool(countries, mode).length} countries`, status: bestStatus(mode, 'On time'), tone: 'idle' };
    }),
  ];
  const [cleanupOpen, setCleanupOpen] = useState(false);

  return (
    <section
      className="panel animate-rise fixed bottom-0 left-0 z-30 flex max-h-[64dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:w-[520px] sm:rounded-2xl"
      aria-labelledby="departures-title"
    >
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <Icon name="plane" size={26} className="rotate-45 text-[var(--color-signage)]" />
        <h1 id="departures-title" className="flex-1">
          <SplitFlap text="Find the Country" className="text-[15px] sm:text-[26px]" />
        </h1>
        <span className="board-type text-[26px] font-bold text-[var(--color-signage)] tabular-nums" aria-label={`Local time ${clock}`}>
          {clock}
        </span>
      </header>

      <div className="mx-5 flex items-center gap-4 rounded-xl bg-[var(--color-tile)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="board-type text-[19px] font-bold">{tier.name}</span>
            <span className="text-[13px] text-white/60 tabular-nums">{progress.miles.toLocaleString()} mi</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={next ? `Progress to ${next.name}` : 'Top tier'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toNext * 100)}>
            <div className="h-full rounded-full bg-[var(--color-signage)]" style={{ width: `${toNext * 100}%` }} />
          </div>
          <div className="mt-1.5 flex gap-3 text-[13px] text-white/60">
            <span>{next ? `${(next.miles - progress.miles).toLocaleString()} mi to ${next.name}` : 'Top tier reached'}</span>
            <span className={streak > 0 ? 'font-bold text-[var(--color-signage)]' : undefined}>{streak > 0 ? `${streak}-day streak` : 'No streak yet'}</span>
          </div>
        </div>
        <button type="button" className="btn shrink-0 flex-col gap-0 px-3 py-1.5" onClick={onPassport} aria-label={`Open passport, ${stamps} stamps`}>
          <Icon name="passport" size={22} />
          <span className="text-[12px] tabular-nums">{stamps}</span>
        </button>
      </div>

      <div className="board-type mt-3 grid grid-cols-[44px_1fr_auto] gap-3 border-b border-[var(--color-rule)] px-5 pb-1.5 text-[13px] font-semibold tracking-[0.1em] text-white/45" aria-hidden="true">
        <span>Gate</span>
        <span>Destination</span>
        <span>Status</span>
      </div>
      <ul className="scroll-thin flex-1 overflow-y-auto pb-2" aria-label="Departures">
        {rows.map((row, i) => (
          <li key={bestScoreKey(row.mode)} className="border-b border-[var(--color-rule)] last:border-b-0">
            <button
              type="button"
              disabled={row.disabled}
              className="group grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors enabled:hover:bg-white/[0.05] disabled:cursor-default"
              onClick={() => onPick(row.mode)}
            >
              <span className="board-type text-[19px] font-bold text-white/55">{gateFor(row.mode)}</span>
              <span className="min-w-0">
                <SplitFlap text={row.destination} delayMs={120 + i * 70} className={`text-[17px] ${row.disabled ? 'opacity-60' : ''}`} />
                <span className="mt-1 block truncate text-[13px] text-white/55">{row.detail}</span>
              </span>
              <span className={`board-type rounded px-2 py-0.5 text-[15px] font-bold whitespace-nowrap ${TONES[row.tone]} ${row.tone === 'go' ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
                {row.tone === 'done' && '✓ '}
                {row.status}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-expanded={cleanupOpen}
            aria-controls="cleanup-continents"
            className="grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
            onClick={() => setCleanupOpen((open) => !open)}
          >
            <span className="board-type text-[19px] font-bold text-white/55">E</span>
            <span className="min-w-0">
              <SplitFlap text="Continent cleanup" delayMs={120 + rows.length * 70} className="text-[17px]" />
              <span className="mt-1 block truncate text-[13px] text-white/55">Find every country on one continent</span>
            </span>
            <span className="board-type flex items-center gap-1 rounded px-2 py-0.5 text-[15px] font-bold whitespace-nowrap text-white/70">
              {cleanupOpen ? 'Pick one' : 'Choose'}
              <Icon name="chevron" size={18} className={`transition-transform duration-200 ${cleanupOpen ? 'rotate-90' : ''}`} />
            </span>
          </button>
          {cleanupOpen && (
            <div id="cleanup-continents" className="grid grid-cols-2 gap-2 px-5 pb-3 sm:grid-cols-3">
              {CONTINENTS.map((continent) => {
                const mode: GameMode = { kind: 'cleanup', continent };
                const total = questionPool(countries, mode).length;
                const best = readBestScore(bestScoreKey(mode));
                return (
                  <button key={continent} type="button" className="flex flex-col items-start rounded-lg bg-[var(--color-tile)] px-3 py-2 text-left transition-colors hover:bg-white/15" onClick={() => onPick(mode)}>
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <span className="board-type text-[13px] font-bold text-white/45">{gateFor(mode)}</span>
                      <span className={`text-[12px] tabular-nums ${best === total ? 'font-bold text-[var(--color-ok)]' : 'text-white/55'}`}>
                        {best > 0 ? `${best}/${total}` : `${total}`}
                      </span>
                    </span>
                    <span className="text-[15px] font-semibold">{continent}</span>
                  </button>
                );
              })}
            </div>
          )}
        </li>
      </ul>
    </section>
  );
}
