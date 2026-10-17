import { useMemo, useState } from 'react';
import { GameCard, GameCardSkeleton } from '../components/GameCard';
import { GameRow } from '../components/GameRow';
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

function IconButton({ onClick, label, children, spinning }: { readonly onClick: () => void; readonly label: string; readonly children: string; readonly spinning?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-base text-text-secondary transition active:scale-95 hover:text-text-primary">
      <span className={spinning ? 'animate-spin' : ''}>{children}</span>
    </button>
  );
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
              <span className="flex items-center gap-1.5 rounded-full bg-accent-live/15 px-2 py-0.5 text-xs font-bold text-accent-live">
                <LiveDot />
                {liveCount}
              </span>
            )}
          </>
        }
        subtitle={data ? `${formatDateTitle(data.date)} · updated ${formatClock(data.updatedAt)} · every ${refreshIntervalSec}s` : 'Loading…'}
        actions={
          <>
            <IconButton onClick={toggleViewMode} label={viewMode === 'cards' ? 'List view' : 'Card view'}>
              {viewMode === 'cards' ? '☰' : '▦'}
            </IconButton>
            <IconButton onClick={refresh} label="Refresh" spinning={refreshing}>
              ↻
            </IconButton>
          </>
        }
      >
        {competitions.length > 1 && (
          <nav className="no-scrollbar mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pb-2.5">
            <button
              onClick={() => setCompetitionFilter(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${activeFilter === null ? 'bg-text-primary text-bg-base' : 'bg-bg-elevated text-text-secondary'}`}
            >
              All · {games.length}
            </button>
            {competitions.map((c) => (
              <button
                key={c.id}
                onClick={() => setCompetitionFilter(activeFilter === c.id ? null : c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${activeFilter === c.id ? 'bg-text-primary text-bg-base' : 'bg-bg-elevated text-text-secondary'}`}
              >
                <CompetitionLogo competitionId={c.id} size={14} />
                {c.name} · {c.count}
                {c.live > 0 && <LiveDot />}
              </button>
            ))}
          </nav>
        )}
      </PageHeader>

      {errorStatus !== null && !data ? (
        <ErrorState status={errorStatus} onRetry={refresh} />
      ) : (
        <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 pt-4">
          {errorStatus !== null && <p className="rounded-lg bg-accent-red/10 px-3 py-2 text-xs text-accent-red">The last refresh failed, showing previous data</p>}
          {loading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }, (_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!loading && sections.length === 0 && (
            <div className="mt-12 flex flex-col items-center gap-2 text-center">
              <span className="text-4xl">🌙</span>
              <p className="font-semibold">No games today in your leagues</p>
              <button onClick={() => navigate({ name: 'settings' })} className="text-sm text-accent-brand">
                Choose leagues and teams
              </button>
            </div>
          )}
          {sections.map((section) => (
            <section key={section.key} className="flex flex-col gap-2.5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                {section.live && <LiveDot />}
                {section.title}
                <span className="font-normal text-text-muted">{section.games.length}</span>
              </h2>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {section.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 2xl:grid-cols-3">
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
