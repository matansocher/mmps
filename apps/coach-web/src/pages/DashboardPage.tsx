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
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import type { Game } from '../types';

type ViewMode = 'cards' | 'list';

const VIEW_MODE_KEY = 'coach:dashboard-view';

function readViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'cards' || stored === 'list') return stored;
  } catch {
    // ignore unavailable storage
  }
  return window.matchMedia('(min-width: 1024px)').matches ? 'cards' : 'list';
}

type GameSection = { readonly key: string; readonly title: string; readonly games: Game[]; readonly live?: boolean };

function buildSections(games: Game[]): GameSection[] {
  // Favourite teams' games lead their status section; the sort is stable, so the rest keep the server order.
  const rest = [...games].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  return [
    { key: 'live', title: 'Live now', games: rest.filter((g) => g.status === 'live'), live: true },
    { key: 'scheduled', title: 'Later today', games: rest.filter((g) => g.status === 'scheduled') },
    { key: 'other', title: 'Other', games: rest.filter((g) => g.status === 'other') },
    { key: 'finished', title: 'Finished', games: rest.filter((g) => g.status === 'finished') },
  ].filter((s) => s.games.length > 0);
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
  const [competitionFilter, setCompetitionFilter] = useState<number | null>(null);
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

  const activeFilter = competitionFilter !== null && competitions.some((c) => c.id === competitionFilter) ? competitionFilter : null;
  const visibleGames = activeFilter === null ? games : games.filter((g) => g.competitionId === activeFilter);
  const sections = buildSections(visibleGames);
  const liveCount = games.filter((g) => g.status === 'live').length;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader
        title={
          <>
            Live
            {liveCount > 0 && (
              <span className="score-font flex h-6 items-center gap-1.5 rounded-full bg-accent-live/12 px-2.5 text-xs font-bold text-accent-live">
                <LiveDot />
                {liveCount}
              </span>
            )}
          </>
        }
        subtitle={data ? `${formatDateTitle(data.date)} · updated ${formatClock(data.updatedAt)} · every ${refreshIntervalSec}s` : 'Loading…'}
        actions={
          <>
            <IconButton onClick={toggleViewMode} label={viewMode === 'cards' ? 'List view' : 'Card view'} icon={viewMode === 'cards' ? 'list' : 'grid'} />
            <IconButton onClick={refresh} label="Refresh" icon="refresh" spinning={refreshing} />
          </>
        }
      >
        {competitions.length > 1 && (
          <nav aria-label="Filter by league" className="no-scrollbar mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pb-3">
            <FilterChip active={activeFilter === null} onClick={() => setCompetitionFilter(null)}>
              All <Count value={games.length} active={activeFilter === null} />
            </FilterChip>
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
          {errorStatus !== null && <p className="rounded-xl border border-accent-red/20 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">Couldn’t refresh. Showing the last results; retrying automatically.</p>}
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
              <p className="text-base font-semibold">No games today in your leagues</p>
              <p className="max-w-xs text-sm text-text-muted">Add more leagues or teams to follow and their games will show up here.</p>
              <button onClick={() => navigate({ name: 'settings' })} className="mt-1 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-white/[0.1]">
                Choose leagues and teams
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
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                  {section.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                  {section.games.map((game) => (
                    <GameRow key={game.id} game={game} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </main>
      )}
    </div>
  );
}
