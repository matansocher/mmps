import { type ReactNode, useMemo, useState } from 'react';
import { GameCard, GameCardSkeleton } from '../components/GameCard';
import { GameRow } from '../components/GameRow';
import { Icon, type IconName } from '../components/Icon';
import { LiveDot } from '../components/LiveDot';
import { CompetitionLogo } from '../components/CompetitionLogo';
import { PageHeader } from '../components/PageHeader';
import { ErrorState } from '../components/ui';
import { useDashboard } from '../hooks/useDashboard';
import { formatClock, formatDateTitle } from '../lib/format';
import { type Messages, useT } from '../lib/i18n';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { Game } from '../types';

type ViewMode = 'cards' | 'list';

const VIEW_MODE_KEY = 'coach:dashboard-view';
const FAVORITES_FILTER = 'favorites';

function readViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'cards' || stored === 'list') return stored;
  } catch {
    // ignore unavailable storage
  }
  return window.matchMedia('(min-width: 1024px)').matches ? 'cards' : 'list';
}

type LeagueGroup = { readonly competitionId: number; readonly name: string; readonly games: Game[] };
type GameSection = { readonly key: string; readonly title: string; readonly games: Game[]; readonly live?: boolean; readonly leagues?: LeagueGroup[] };

// Leagues with a favourite team's game come first; otherwise leagues keep the server order. Games run by kick-off.
function groupByLeague(games: readonly Game[]): LeagueGroup[] {
  const groups = new Map<number, LeagueGroup>();
  for (const game of games) {
    const group = groups.get(game.competitionId) ?? { competitionId: game.competitionId, name: game.competitionName, games: [] };
    group.games.push(game);
    groups.set(game.competitionId, group);
  }
  const byKickoff = (a: Game, b: Game) => a.startTime.localeCompare(b.startTime) || a.id - b.id;
  return [...groups.values()]
    .map((g) => ({ ...g, games: [...g.games].sort(byKickoff) }))
    .sort((a, b) => Number(b.games.some((g) => g.isFavorite)) - Number(a.games.some((g) => g.isFavorite)));
}

function buildSections(games: Game[], t: Messages['dashboard']['sections']): GameSection[] {
  // Favourite teams' games lead their status section; the sort is stable, so the rest keep the server order.
  const rest = [...games].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  const finished = games.filter((g) => g.status === 'finished');
  return [
    { key: 'live', title: t.live, games: rest.filter((g) => g.status === 'live'), live: true },
    { key: 'scheduled', title: t.scheduled, games: rest.filter((g) => g.status === 'scheduled') },
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

function FilterChip({ active, onClick, children }: { readonly active: boolean; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brand ${
        active ? 'border-transparent bg-text-primary text-bg-base' : 'border-white/[0.06] bg-white/[0.03] text-text-secondary hover:bg-white/[0.07] hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function Count({ value, active }: { readonly value: number; readonly active: boolean }) {
  return <span className={`score-font text-[11px] ${active ? 'text-bg-base/60' : 'text-text-muted'}`}>{value}</span>;
}

export function DashboardPage() {
  const { data, loading, refreshing, errorStatus, refresh, refreshIntervalSec } = useDashboard();
  const t = useT();
  const [competitionFilter, setCompetitionFilter] = useState<number | typeof FAVORITES_FILTER | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);

  const toggleViewMode = () => {
    const next = viewMode === 'cards' ? 'list' : 'cards';
    hapticSelect();
    setViewMode(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // ignore unavailable storage
    }
  };

  const games = useMemo(() => data?.games ?? [], [data]);
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

  const favoriteGames = games.filter((g) => g.isFavorite);
  const filterAvailable = competitionFilter === FAVORITES_FILTER ? favoriteGames.length > 0 : competitions.some((c) => c.id === competitionFilter);
  const activeFilter = competitionFilter !== null && filterAvailable ? competitionFilter : null;
  const visibleGames = activeFilter === null ? games : activeFilter === FAVORITES_FILTER ? favoriteGames : games.filter((g) => g.competitionId === activeFilter);
  const sections = buildSections(visibleGames, t.dashboard.sections);
  const liveCount = games.filter((g) => g.status === 'live').length;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader
        title={
          <>
            {t.dashboard.title}
            {liveCount > 0 && (
              <span className="score-font flex h-6 items-center gap-1.5 rounded-full bg-accent-live/12 px-2.5 text-xs font-bold text-accent-live">
                <LiveDot />
                {liveCount}
              </span>
            )}
          </>
        }
        subtitle={data ? t.dashboard.subtitle(formatDateTitle(data.date), formatClock(data.updatedAt), refreshIntervalSec) : t.common.loading}
        actions={
          <>
            <IconButton onClick={toggleViewMode} label={viewMode === 'cards' ? t.dashboard.listView : t.dashboard.cardView} icon={viewMode === 'cards' ? 'list' : 'grid'} />
            <IconButton onClick={refresh} label={t.dashboard.refresh} icon="refresh" spinning={refreshing} />
          </>
        }
      >
        {(competitions.length > 1 || favoriteGames.length > 0) && (
          <nav aria-label={t.dashboard.filterByLeague} className="no-scrollbar mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pb-3">
            <FilterChip active={activeFilter === null} onClick={() => setCompetitionFilter(null)}>
              {t.dashboard.all} <Count value={games.length} active={activeFilter === null} />
            </FilterChip>
            {favoriteGames.length > 0 && (
              <FilterChip active={activeFilter === FAVORITES_FILTER} onClick={() => setCompetitionFilter(activeFilter === FAVORITES_FILTER ? null : FAVORITES_FILTER)}>
                <Icon name="star" size={14} className={activeFilter === FAVORITES_FILTER ? '' : 'text-accent-draw'} />
                {t.dashboard.myTeams}
                <Count value={favoriteGames.length} active={activeFilter === FAVORITES_FILTER} />
                {favoriteGames.some((g) => g.status === 'live') && <LiveDot />}
              </FilterChip>
            )}
            {competitions.map((c) => (
              <FilterChip key={c.id} active={activeFilter === c.id} onClick={() => setCompetitionFilter(activeFilter === c.id ? null : c.id)}>
                <CompetitionLogo competitionId={c.id} size={16} />
                {c.name}
                <Count value={c.count} active={activeFilter === c.id} />
                {c.live > 0 && <LiveDot />}
              </FilterChip>
            ))}
          </nav>
        )}
      </PageHeader>

      {errorStatus !== null && !data ? (
        <ErrorState status={errorStatus} onRetry={refresh} />
      ) : (
        <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 pt-5">
          {errorStatus !== null && <p className="rounded-xl border border-accent-red/20 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">{t.dashboard.refreshFailed}</p>}
          {loading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }, (_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!loading && sections.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-text-muted">
                <Icon name="moon" size={26} />
              </span>
              <p className="text-base font-semibold">{t.dashboard.emptyTitle}</p>
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
                    <div key={league.competitionId} className="flex flex-col gap-2.5">
                      <h3 className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                        <CompetitionLogo competitionId={league.competitionId} size={16} />
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
      )}
    </div>
  );
}
