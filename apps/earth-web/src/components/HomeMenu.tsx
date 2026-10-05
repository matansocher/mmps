import { useState } from 'react';
import { CONTINENTS, type Continent, type GameMode, bestScoreKey, questionPool } from '../game/modes';
import { currentStreak, dailyNumber, levelFor, localDay } from '../game/progression';
import { readBestScore } from '../hooks/useBestScore';
import { useProgress } from '../store/progress';
import type { Country } from '../types';
import { Icon } from './Icon';

type Props = {
  readonly countries: readonly Country[];
  readonly onPick: (mode: GameMode) => void;
  readonly onCollection: () => void;
};

const bestLabel = (mode: GameMode) => {
  const best = readBestScore(bestScoreKey(mode));
  return best > 0 ? `Best ${best}/10` : null;
};

type ModeRowProps = {
  readonly title: string;
  readonly detail: string;
  readonly badge?: string | null;
  readonly highlight?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
};

function ModeRow({ title, detail, badge, highlight, disabled, onClick }: ModeRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors disabled:cursor-default ${highlight ? 'bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/50 enabled:hover:bg-[var(--color-accent)]/25' : 'bg-[var(--color-tile)] enabled:hover:bg-white/10'}`}
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] font-bold ${disabled ? 'text-white/60' : ''}`}>{title}</span>
        <span className="mt-0.5 block truncate text-[13px] text-white/55">{detail}</span>
      </span>
      {badge && <span className="shrink-0 text-[13px] font-semibold whitespace-nowrap text-white/70 tabular-nums">{badge}</span>}
      {!disabled && <Icon name="chevron" size={18} className="shrink-0 text-white/40" />}
    </button>
  );
}

type GroupProps = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly countries: readonly Country[];
  readonly modeFor: (continent: Continent) => GameMode;
  readonly onPick: (mode: GameMode) => void;
  readonly scoreOf: (best: number, total: number) => string;
};

function ContinentGroup({ id, title, detail, open, onToggle, countries, modeFor, onPick, scoreOf }: GroupProps) {
  return (
    <div className="rounded-xl bg-[var(--color-tile)]">
      <button type="button" aria-expanded={open} aria-controls={id} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/10" onClick={onToggle}>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold">{title}</span>
          <span className="mt-0.5 block truncate text-[13px] text-white/55">{detail}</span>
        </span>
        <span className="text-[13px] text-white/55">{open ? 'Pick one' : 'Choose'}</span>
        <Icon name="chevron" size={18} className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div id={id} className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3">
          {CONTINENTS.map((continent) => {
            const mode = modeFor(continent);
            const total = questionPool(countries, mode).length;
            const best = readBestScore(bestScoreKey(mode));
            const done = mode.kind === 'cleanup' ? best === total : best === 10;
            return (
              <button key={continent} type="button" className="flex flex-col items-start rounded-lg bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/15" onClick={() => onPick(mode)}>
                <span className="text-[15px] font-semibold">{continent}</span>
                <span className={`text-[12px] tabular-nums ${done ? 'font-bold text-[var(--color-ok)]' : 'text-white/55'}`}>{scoreOf(best, total)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// The home screen: level/XP header plus every game mode.
export function HomeMenu({ countries, onPick, onCollection }: Props) {
  const progress = useProgress();
  const today = localDay(new Date());
  const streak = currentStreak(progress, today);
  const { level, next, progress: toNext } = levelFor(progress.miles);
  const dailyScore = progress.daily[today];
  const found = Object.keys(progress.stamps).length;
  const [open, setOpen] = useState<'sprint' | 'cleanup' | null>(null);
  const toggle = (group: 'sprint' | 'cleanup') => setOpen((current) => (current === group ? null : group));

  return (
    <section
      className="panel animate-rise fixed bottom-0 left-0 z-30 flex max-h-[64dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:w-[520px] sm:rounded-2xl"
      aria-labelledby="home-title"
    >
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <Icon name="globe" size={26} className="text-[var(--color-accent-soft)]" />
        <h1 id="home-title" className="flex-1 text-[20px] font-bold sm:text-[24px]">
          Find the Country
        </h1>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-[14px] font-bold text-[#fbbf24]" aria-label={`${streak}-day streak`}>
            <Icon name="bolt" size={18} />
            {streak}
          </span>
        )}
      </header>

      <div className="mx-5 flex items-center gap-4 rounded-xl bg-[var(--color-tile)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[17px] font-bold">Level {level.level}</span>
            <span className="text-[13px] text-white/60 tabular-nums">{progress.miles.toLocaleString()} XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={next ? `Progress to level ${next.level}` : 'Max level'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toNext * 100)}>
            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${toNext * 100}%` }} />
          </div>
          <div className="mt-1.5 text-[13px] text-white/60">{next ? `${(next.xp - progress.miles).toLocaleString()} XP to level ${next.level}` : 'Max level reached'}</div>
        </div>
        <button type="button" className="btn shrink-0 flex-col gap-0 px-3 py-1.5" onClick={onCollection} aria-label={`Open collection, ${found} countries found`}>
          <Icon name="flag" size={22} />
          <span className="text-[12px] tabular-nums">{found}</span>
        </button>
      </div>

      <div className="scroll-thin mt-3 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
        {dailyScore === undefined ? (
          <ModeRow title={`Daily challenge #${dailyNumber(today)}`} detail="Same 10 countries for everyone · 1.5× XP" badge="New" highlight onClick={() => onPick({ kind: 'daily', day: today })} />
        ) : (
          <ModeRow title="Daily challenge" detail="Come back tomorrow for a new one" badge={`✓ ${dailyScore}/10`} disabled onClick={() => undefined} />
        )}
        <ModeRow title="Classic" detail="10 countries, anywhere on Earth" badge={bestLabel({ kind: 'classic' })} onClick={() => onPick({ kind: 'classic' })} />
        <ModeRow title="Name it" detail="Pick the highlighted country from 4 nearby names" badge={bestLabel({ kind: 'name-it' })} onClick={() => onPick({ kind: 'name-it' })} />
        <ContinentGroup
          id="sprint-continents"
          title="Continent sprint"
          detail="10 countries from one continent"
          open={open === 'sprint'}
          onToggle={() => toggle('sprint')}
          countries={countries}
          modeFor={(continent) => ({ kind: 'continent', continent })}
          onPick={onPick}
          scoreOf={(best, total) => (best > 0 ? `Best ${best}/10` : `${total} countries`)}
        />
        <ContinentGroup
          id="cleanup-continents"
          title="Continent cleanup"
          detail="Find every country on one continent"
          open={open === 'cleanup'}
          onToggle={() => toggle('cleanup')}
          countries={countries}
          modeFor={(continent) => ({ kind: 'cleanup', continent })}
          onPick={onPick}
          scoreOf={(best, total) => (best > 0 ? `${best}/${total}` : `${total} countries`)}
        />
      </div>
    </section>
  );
}
