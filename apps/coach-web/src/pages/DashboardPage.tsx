import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { type CardActions, CardActionsContext } from '../components/CardActions';
import { GameCard, GameCardSkeleton } from '../components/GameCard';
import { GameRow } from '../components/GameRow';
import { Icon, type IconName } from '../components/Icon';
import { LiveDot } from '../components/LiveDot';
import { CompetitionLogo } from '../components/CompetitionLogo';
import { PageHeader } from '../components/PageHeader';
import { PreMatchModal } from '../components/PreMatchModal';
import { RefreshBanner } from '../components/RefreshBanner';
import { TimeAgo } from '../components/TimeAgo';
import { ErrorState } from '../components/ui';
import { useDashboard } from '../hooks/useDashboard';
import { daysBetween, shiftDate } from '../lib/dates';
import { formatDateTitle, formatDayLabel } from '../lib/format';
import { leagueColor, leagueTextColor } from '../lib/league-themes';
import { type Messages, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { Game } from '../types';

type ViewMode = 'cards' | 'list';

const VIEW_MODE_KEY = 'coach:dashboard-view';
const FAVORITES_FILTER = 'favorites';
// Matches the server's MAX_DASHBOARD_DAY_OFFSET.
const MAX_DAY_OFFSET = 7;

function readViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'cards' || stored === 'list') return stored;
  } catch {
    // ignore unavailable storage
  }
  // Until the user picks one: the compact list on phones, the detailed cards on wider screens.
  return window.matchMedia('(min-width: 768px)').matches ? 'cards' : 'list';
}

// competitionId is absent for the favourite-teams group.
type LeagueGroup = { readonly key: string; readonly competitionId?: number; readonly name: string; readonly games: Game[] };
type GameSection = { readonly key: string; readonly title: string; readonly games: Game[]; readonly live?: boolean; readonly leagues?: LeagueGroup[] };
type PreMatchTarget = { readonly game: Game; readonly trigger: HTMLElement };

// Favourite leagues come first; games run by favourite team, then kick-off.
function groupByLeague(games: readonly Game[]): LeagueGroup[] {
  const groups = new Map<number, LeagueGroup>();
  for (const game of games) {
    const group = groups.get(game.competitionId) ?? { key: `${game.competitionId}`, competitionId: game.competitionId, name: game.competitionName, games: [] };
    group.games.push(game);
    groups.set(game.competitionId, group);
  }
  const byPriority = (a: Game, b: Game) => Number(b.isFavorite) - Number(a.isFavorite) || a.startTime.localeCompare(b.startTime) || a.id - b.id;
  const top = (group: LeagueGroup) => Number(group.games.some((g) => g.isFavorite));
  return [...groups.values()].map((g) => ({ ...g, games: [...g.games].sort(byPriority) })).sort((a, b) => top(b) - top(a));
}

// Favourite teams' games get their own group by kick-off, ahead of the leagues.
function groupWithFavorites(games: readonly Game[], title: string): LeagueGroup[] {
  const favorites = games.filter((g) => g.isFavorite).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id);
  const leagues = groupByLeague(games.filter((g) => !g.isFavorite));
  return favorites.length ? [{ key: 'favorites', name: title, games: favorites }, ...leagues] : leagues;
}

function buildSections(games: Game[], t: Messages['dashboard']['sections'], myTeams: string, isToday: boolean): GameSection[] {
  // The sort is stable, so games of equal priority keep the server order.
  const rest = [...games].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  const scheduled = rest.filter((g) => g.status === 'scheduled');
  const finished = games.filter((g) => g.status === 'finished');
  return [
    { key: 'live', title: t.live, games: rest.filter((g) => g.status === 'live'), live: true },
    { key: 'scheduled', title: isToday ? t.scheduled : t.upcoming, games: scheduled, leagues: groupWithFavorites(scheduled, myTeams) },
    { key: 'other', title: t.other, games: rest.filter((g) => g.status === 'other') },
    { key: 'finished', title: t.finished, games: finished, leagues: groupByLeague(finished) },
  ].filter((s) => s.games.length > 0);
}

function GameGrid({ games, viewMode }: { readonly games: readonly Game[]; readonly viewMode: ViewMode }) {
  return viewMode === 'cards' ? (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
      {games.map((game) => (
        <GameRow key={game.id} game={game} />
      ))}
    </div>
  );
}

function IconButton({ onClick, label, icon, spinning }: { readonly onClick: () => void; readonly label: string; readonly icon: IconName; readonly spinning?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-text-secondary transition duration-150 ease-out hover:bg-white/[0.08] hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand active:scale-95"
    >
      <Icon name={icon} size={17} className={spinning ? 'animate-spin' : ''} />
    </button>
  );
}

function ViewToggle({ value, onChange }: { readonly value: ViewMode; readonly onChange: (mode: ViewMode) => void }) {
  const t = useT();
  const options: { id: ViewMode; icon: IconName; label: string }[] = [
    { id: 'cards', icon: 'grid', label: t.dashboard.cardView },
    { id: 'list', icon: 'list', label: t.dashboard.listView },
  ];
  return (
    <div role="group" aria-label={t.dashboard.viewMode} className="flex h-9 shrink-0 items-center rounded-full border border-white/[0.06] bg-white/[0.03] p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => value !== o.id && onChange(o.id)}
          aria-pressed={value === o.id}
          aria-label={o.label}
          title={o.label}
          className={`flex h-full w-9 items-center justify-center rounded-full transition duration-150 ease-out ${
            value === o.id ? 'bg-white/[0.1] text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.4)]' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Icon name={o.icon} size={16} />
        </button>
      ))}
    </div>
  );
}

function DayButton({ onClick, label, disabled, flip }: { readonly onClick: () => void; readonly label: string; readonly disabled: boolean; readonly flip?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition duration-150 ease-out hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand active:scale-95 disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name="back" size={18} className={flip ? '-scale-x-100 rtl:scale-x-100' : 'rtl:-scale-x-100'} />
    </button>
  );
}

function DayNavigator({ date, today, onChange }: { readonly date: string; readonly today: string; readonly onChange: (date: string) => void }) {
  const t = useT();
  const offset = daysBetween(today, date);
  const go = (next: string) => {
    hapticSelect();
    onChange(next);
  };
  return (
    <div role="group" aria-label={t.dashboard.day.label} className="mx-auto flex max-w-[1500px] items-center gap-1 px-3 pb-2">
      <DayButton onClick={() => go(shiftDate(date, -1))} label={t.dashboard.day.previous} disabled={offset <= -MAX_DAY_OFFSET} />
      <span aria-live="polite" className={`min-w-24 text-center text-sm font-semibold ${offset === 0 ? 'text-text-primary' : 'text-accent-brand'}`}>
        {formatDayLabel(date, today)}
      </span>
      <DayButton onClick={() => go(shiftDate(date, 1))} label={t.dashboard.day.next} disabled={offset >= MAX_DAY_OFFSET} flip />
      {offset !== 0 && (
        <button
          onClick={() => go(today)}
          className="ms-auto flex h-8 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-[13px] font-semibold text-text-primary transition duration-150 ease-out hover:bg-white/[0.1] active:scale-[0.97]"
        >
          {t.dashboard.day.today}
          <Icon name="back" size={14} className={offset < 0 ? '-scale-x-100 rtl:scale-x-100' : 'rtl:-scale-x-100'} />
        </button>
      )}
    </div>
  );
}

type ChipTone = { readonly background: string; readonly color: string };

const ALL_TONE: ChipTone = { background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' };
const FAVORITES_TONE: ChipTone = { background: 'var(--color-accent-draw)', color: '#0a0e14' };

function FilterChip({ active, tone, onClick, children }: { readonly active: boolean; readonly tone: ChipTone; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      data-active={active || undefined}
      style={active ? ({ backgroundColor: tone.background, color: tone.color } as CSSProperties) : undefined}
      className={`group/chip flex h-9 shrink-0 items-center gap-2 rounded-full border ps-2.5 pe-1.5 text-[13px] font-medium transition duration-150 ease-out active:scale-[0.97] ${
        active ? 'border-transparent font-semibold shadow-[0_2px_10px_-2px_rgba(0,0,0,0.5)]' : 'border-white/[0.07] bg-white/[0.03] text-text-secondary hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function Count({ value, live, active }: { readonly value: number; readonly live?: boolean; readonly active: boolean }) {
  return (
    <span
      className={`score-font flex h-6 min-w-6 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] ${
        active ? 'bg-black/15' : live ? 'bg-accent-live/12 text-accent-live' : 'bg-white/[0.06] text-text-muted'
      }`}
    >
      {live && <LiveDot />}
      {value}
    </span>
  );
}

// Horizontal chip strip: fades the edges that have more chips to scroll to and keeps the active chip in view.
function ChipStrip({ label, activeKey, children }: { readonly label: string; readonly activeKey: string; readonly children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const offset = Math.abs(el.scrollLeft);
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: offset > 2, end: max - offset > 2 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [activeKey]);

  const fade = (on: boolean) => (on ? 'transparent, #000 40px' : '#000, #000');
  return (
    <nav
      ref={ref}
      aria-label={label}
      className="no-scrollbar mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pt-1 pb-3"
      style={{ maskImage: `linear-gradient(to var(--chip-fade-dir), ${fade(edges.start)}, #000 calc(100% - 40px), ${edges.end ? 'transparent' : '#000'})` } as CSSProperties}
    >
      {children}
    </nav>
  );
}

export function DashboardPage() {
  const { data, loading, refreshing, errorStatus, refresh, lastSuccessAt, nextRetryAt, online, recovered, selectedDate, setDate } = useDashboard();
  const t = useT();
  const [competitionFilter, setCompetitionFilter] = useState<number | typeof FAVORITES_FILTER | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const [preMatch, setPreMatch] = useState<PreMatchTarget | null>(null);

  const changeViewMode = (next: ViewMode) => {
    hapticSelect();
    setViewMode(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // ignore unavailable storage
    }
  };

  // While another day loads, the previous day's games give way to skeletons.
  const switchingDay = !!data && selectedDate !== null && data.date !== selectedDate;
  const shownDate = switchingDay ? selectedDate : data?.date;
  const isToday = !data || shownDate === data.today;
  const games = useMemo(() => (switchingDay ? [] : (data?.games ?? [])), [data, switchingDay]);
  const competitions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number; live: number }>();
    for (const g of games) {
      const entry = map.get(g.competitionId) ?? { id: g.competitionId, name: g.competitionName, count: 0, live: 0 };
      entry.count += 1;
      if (g.status === 'live') entry.live += 1;
      map.set(g.competitionId, entry);
    }
    return [...map.values()];
  }, [games]);

  const cardActions = useMemo<CardActions>(
    () => ({
      openPreMatch: (game, trigger) => setPreMatch({ game, trigger }),
    }),
    [],
  );

  const favoriteGames = games.filter((g) => g.isFavorite);
  const filterAvailable = competitionFilter === FAVORITES_FILTER ? favoriteGames.length > 0 : competitions.some((c) => c.id === competitionFilter);
  const activeFilter = competitionFilter !== null && filterAvailable ? competitionFilter : null;
  const visibleGames = activeFilter === null ? games : activeFilter === FAVORITES_FILTER ? favoriteGames : games.filter((g) => g.competitionId === activeFilter);
  const sections = buildSections(visibleGames, t.dashboard.sections, t.dashboard.myTeams, isToday);
  const stale = errorStatus !== null && !!data;

  const liveCount = games.filter((g) => g.status === 'live').length;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader
        title={
          <>
            {t.dashboard.title}
            {liveCount > 0 && (
              <span className="flex items-center" role="img" aria-label={t.dashboard.liveGames(liveCount)} title={t.dashboard.liveGames(liveCount)}>
                <LiveDot />
              </span>
            )}
          </>
        }
        subtitle={
          data ? (
            <>
              {formatDateTitle(shownDate)} ·{' '}
              <TimeAgo iso={data.updatedAt} />
            </>
          ) : (
            t.common.loading
          )
        }
        actions={
          <>
            <ViewToggle value={viewMode} onChange={changeViewMode} />
            <IconButton onClick={refresh} label={t.dashboard.refresh} icon="refresh" spinning={refreshing} />
          </>
        }
      >
        {data && <DayNavigator date={shownDate} today={data.today} onChange={setDate} />}
        {(competitions.length > 1 || favoriteGames.length > 0) && (
          <ChipStrip label={t.dashboard.filterByLeague} activeKey={String(activeFilter)}>
            <FilterChip active={activeFilter === null} tone={ALL_TONE} onClick={() => setCompetitionFilter(null)}>
              <span className="ps-1">{t.dashboard.all}</span>
              <Count value={games.length} active={activeFilter === null} />
            </FilterChip>
            {favoriteGames.length > 0 && (
              <FilterChip active={activeFilter === FAVORITES_FILTER} tone={FAVORITES_TONE} onClick={() => setCompetitionFilter(activeFilter === FAVORITES_FILTER ? null : FAVORITES_FILTER)}>
                <Icon name="star" size={15} className={activeFilter === FAVORITES_FILTER ? '' : 'text-accent-draw'} />
                {t.dashboard.myTeams}
                <Count value={favoriteGames.length} live={favoriteGames.some((g) => g.status === 'live')} active={activeFilter === FAVORITES_FILTER} />
              </FilterChip>
            )}
            {competitions.map((c) => (
              <FilterChip
                key={c.id}
                active={activeFilter === c.id}
                tone={{ background: leagueColor(c.id), color: leagueTextColor(c.id) }}
                onClick={() => setCompetitionFilter(activeFilter === c.id ? null : c.id)}
              >
                <span className={`flex size-5 items-center justify-center rounded-full ${activeFilter === c.id ? 'bg-white' : ''}`}>
                  <CompetitionLogo competitionId={c.id} size={16} />
                </span>
                {c.name}
                <Count value={c.count} live={c.live > 0} active={activeFilter === c.id} />
              </FilterChip>
            ))}
          </ChipStrip>
        )}
      </PageHeader>

      {errorStatus !== null && (!data || switchingDay) ? (
        <ErrorState status={errorStatus} onRetry={refresh} />
      ) : (
        <CardActionsContext.Provider value={cardActions}>
        <RefreshBanner failed={stale} online={online} refreshing={refreshing} lastSuccessAt={lastSuccessAt} nextRetryAt={nextRetryAt} recovered={recovered} onRetry={refresh} />
        <main data-stale={stale || undefined} className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 pt-5">
          {data && !switchingDay && selectedDate === null && data.date !== data.today && (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-text-secondary">
              <Icon name="moon" size={16} className="shrink-0 text-text-muted" />
              {t.dashboard.day.lastNight}
            </div>
          )}
          {(loading || switchingDay) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }, (_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!loading && !switchingDay && games.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-text-muted">
                <Icon name="moon" size={26} />
              </span>
              <p className="text-base font-semibold">{isToday ? t.dashboard.emptyTitle : t.dashboard.emptyTitleDay}</p>
              <p className="max-w-xs text-sm text-text-muted">{t.dashboard.emptyText}</p>
              <button onClick={() => navigate({ name: 'settings' })} className="mt-1 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/[0.1]">
                {t.dashboard.emptyAction}
              </button>
            </div>
          )}
          {sections.map((section) => (
            <section key={section.key} aria-labelledby={`section-${section.key}`} className="flex flex-col gap-3">
              <h2 id={`section-${section.key}`} className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em] text-text-primary">
                {section.live && <LiveDot />}
                {section.title}
                <span className="score-font rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{section.games.length}</span>
              </h2>
              {section.leagues && section.leagues.length > 1 ? (
                <div className="flex flex-col gap-5">
                  {section.leagues.map((league) => (
                    <div key={league.key} className="flex flex-col gap-2.5">
                      <h3 className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                        {league.competitionId === undefined ? <Icon name="star" size={16} className="text-accent-draw" /> : <CompetitionLogo competitionId={league.competitionId} size={16} />}
                        {league.name}
                        <span className="score-font text-[11px] font-medium text-text-muted">{league.games.length}</span>
                      </h3>
                      <GameGrid games={league.games} viewMode={viewMode} />
                    </div>
                  ))}
                </div>
              ) : (
                <GameGrid games={section.leagues?.[0]?.games ?? section.games} viewMode={viewMode} />
              )}
            </section>
          ))}
        </main>
        {preMatch && <PreMatchModal game={games.find((g) => g.id === preMatch.game.id) ?? preMatch.game} trigger={preMatch.trigger} onClose={() => setPreMatch(null)} />}
        </CardActionsContext.Provider>
      )}
    </div>
  );
}
