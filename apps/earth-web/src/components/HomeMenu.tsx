import { useRef, useState } from 'react';
import { randomLogicDay } from '../game/logic';
import { CONTINENTS, type Continent, type GameMode, bestScoreKey, LOGIC_DIFFICULTY_LABELS, questionPool } from '../game/modes';
import { LOGIC_DIFFICULTIES, LOGIC_MAX_GUESSES } from '../../../../src/shared/worldly/logic-puzzle';
import { currentStreak, dailyNumber, levelFor, localDay } from '../game/progression';
import { readBestScore } from '../hooks/useBestScore';
import { useBottomSheet } from '../hooks/useBottomSheet';
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

const countriesLabel = (n: number) => (n === 1 ? '1 country' : `${n} countries`);

type TileProps = {
  readonly emoji: string;
  readonly title: string;
  readonly detail: string;
  readonly badge?: string | null;
  readonly expanded?: boolean;
  readonly controls?: string;
  readonly onClick: () => void;
};

function ModeTile({ emoji, title, detail, badge, expanded, controls, onClick }: TileProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      className={`flex min-h-[104px] flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors ${expanded ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12' : 'border-transparent bg-[var(--color-tile)] hover:bg-white/10'}`}
      onClick={onClick}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="text-[26px] leading-none" aria-hidden="true">
          {emoji}
        </span>
        {badge && <span className="text-[12px] font-bold whitespace-nowrap text-white/75 tabular-nums">{badge}</span>}
        {expanded !== undefined && <Icon name="chevron" size={16} className={`text-white/75 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />}
      </span>
      <span className="mt-auto pt-2 text-[16px] font-bold">{title}</span>
      <span className="text-[13px] leading-snug text-white/75">{detail}</span>
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
          <span className="mt-0.5 block truncate text-[13px] text-white/75">{detail}</span>
        </span>
        <span className="text-[13px] text-white/75">{open ? 'Pick one' : 'Choose'}</span>
        <Icon name="chevron" size={18} className={`shrink-0 text-white/75 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
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
                <span className="text-[15px] font-bold">{continent}</span>
                <span className={`text-[12px] tabular-nums ${done ? 'font-bold text-[var(--color-ok)]' : 'text-white/75'}`}>{scoreOf(best, total)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const LOGIC_DIFFICULTY_DETAILS = { easy: 'Famous countries', medium: 'Well-known countries', hard: 'Obscure countries' } as const;

function LogicPicker({ onPick }: { readonly onPick: (mode: GameMode) => void }) {
  return (
    <div id="logic-difficulties" className="animate-rise rounded-2xl bg-[var(--color-tile)] p-3">
      <p className="px-1 pb-2 text-[13px] text-white/75">One mystery country, clue by clue · {LOGIC_MAX_GUESSES} guesses</p>
      <div className="grid grid-cols-3 gap-2">
        {LOGIC_DIFFICULTIES.map((difficulty) => {
          const best = readBestScore(bestScoreKey({ kind: 'logic', day: '', difficulty }));
          return (
            <button
              key={difficulty}
              type="button"
              className="flex min-h-12 flex-col items-start rounded-lg bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/15"
              onClick={() => onPick({ kind: 'logic', day: randomLogicDay(), difficulty })}
            >
              <span className="text-[15px] font-bold">{LOGIC_DIFFICULTY_LABELS[difficulty]}</span>
              <span className="text-[12px] text-white/75 tabular-nums">{best > 0 ? `Best ${best}/${LOGIC_MAX_GUESSES}` : LOGIC_DIFFICULTY_DETAILS[difficulty]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Panel = 'logic' | 'continents';
type Group = 'sprint' | 'cleanup';

// The home screen: progress line, today's daily as the hero, then a grid of modes.
export function HomeMenu({ countries, onPick, onCollection }: Props) {
  const progress = useProgress();
  const today = localDay(new Date());
  const streak = currentStreak(progress, today);
  const { level, next, progress: toNext } = levelFor(progress.miles);
  const dailyScore = progress.daily[today];
  const found = Object.keys(progress.stamps).length;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [group, setGroup] = useState<Group | null>('sprint');
  const togglePanel = (next: Panel) => setPanel((current) => (current === next ? null : next));
  const toggleGroup = (next: Group) => setGroup((current) => (current === next ? null : next));
  const sheetRef = useRef<HTMLElement>(null);
  useBottomSheet(sheetRef);

  return (
    <section
      ref={sheetRef}
      className="panel animate-rise fixed bottom-0 left-0 z-30 flex max-h-[64dvh] w-full flex-col overflow-hidden rounded-t-[22px] border-b-0 sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:w-[480px] sm:rounded-[22px] sm:border-b"
      aria-labelledby="home-title"
    >
      <header className="px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <Icon name="globe" size={24} className="text-[var(--color-accent-soft)]" />
          <h1 id="home-title" className="flex-1 text-[20px] font-bold sm:text-[22px]">
            Find the Country
          </h1>
          {streak > 0 && (
            <span className="chip text-[var(--color-warn)]" aria-label={`${streak}-day streak`}>
              <Icon name="bolt" size={16} />
              {streak}
            </span>
          )}
          <button type="button" className="chip min-h-11 hover:bg-white/15" onClick={onCollection} aria-label={`Open passport, ${countriesLabel(found)} found`}>
            <Icon name="flag" size={16} />
            {found}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3 text-[13px] tabular-nums">
          <span className="font-bold">Lv {level.level}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={next ? `Progress to level ${next.level}` : 'Max level'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toNext * 100)}>
            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${toNext * 100}%` }} />
          </div>
          <span className="text-white/75">{next ? `${(next.xp - progress.miles).toLocaleString()} XP to Lv ${next.level}` : 'Max level'}</span>
        </div>
      </header>

      <div className="scroll-thin mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-[calc(16px+var(--safe-bottom))] sm:pb-5">
        {dailyScore === undefined ? (
          <button
            type="button"
            className="group block w-full rounded-2xl bg-[linear-gradient(135deg,var(--color-accent)_0%,#3d6fd1_45%,var(--color-tile)_100%)] p-4 text-left text-white shadow-[0_10px_30px_rgb(46_96_200/0.35)]"
            onClick={() => onPick({ kind: 'daily', day: today })}
          >
            <span className="text-[12px] font-bold tracking-[0.08em] text-white/90 uppercase">Daily #{dailyNumber(today)} · 1.5× XP</span>
            <span className="mt-1 block text-[22px] leading-tight font-bold">Today’s 10 countries</span>
            <span className="mt-0.5 block text-[14px] text-white/85">Same ones for everyone. One go per day.</span>
            <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[15px] font-bold text-[var(--color-ink)] transition-transform group-hover:translate-x-0.5">
              Play daily <Icon name="next" size={16} />
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-tile)] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-ok)]/15 text-[var(--color-ok)]">
              <Icon name="check" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold">Daily #{dailyNumber(today)} done · {dailyScore}/10</span>
              <span className="block text-[13px] text-white/75">A new one unlocks tomorrow.</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <ModeTile emoji="🌍" title="Classic" detail="10 countries, anywhere" badge={bestLabel({ kind: 'classic' })} onClick={() => onPick({ kind: 'classic' })} />
          <ModeTile emoji="🔤" title="Name it" detail="Pick from 4 names" badge={bestLabel({ kind: 'name-it' })} onClick={() => onPick({ kind: 'name-it' })} />
          <ModeTile emoji="🧩" title="Earth Logic" detail="Clue by clue" expanded={panel === 'logic'} controls="logic-difficulties" onClick={() => togglePanel('logic')} />
          <ModeTile emoji="🏁" title="Continents" detail="Sprint or clean up" expanded={panel === 'continents'} controls="continent-modes" onClick={() => togglePanel('continents')} />
        </div>

        {panel === 'logic' && <LogicPicker onPick={onPick} />}
        {panel === 'continents' && (
          <div id="continent-modes" className="animate-rise space-y-2">
            <ContinentGroup
              id="sprint-continents"
              title="Continent sprint"
              detail="10 countries from one continent"
              open={group === 'sprint'}
              onToggle={() => toggleGroup('sprint')}
              countries={countries}
              modeFor={(continent) => ({ kind: 'continent', continent })}
              onPick={onPick}
              scoreOf={(best, total) => (best > 0 ? `Best ${best}/10` : countriesLabel(total))}
            />
            <ContinentGroup
              id="cleanup-continents"
              title="Continent cleanup"
              detail="Find every country on one continent"
              open={group === 'cleanup'}
              onToggle={() => toggleGroup('cleanup')}
              countries={countries}
              modeFor={(continent) => ({ kind: 'cleanup', continent })}
              onPick={onPick}
              scoreOf={(best, total) => (best > 0 ? `${best}/${total}` : countriesLabel(total))}
            />
          </div>
        )}
      </div>
    </section>
  );
}
