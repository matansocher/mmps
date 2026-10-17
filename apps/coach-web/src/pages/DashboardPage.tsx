import { useMemo, useState } from 'react';
import { Feed } from '../components/Feed';
import { GameCard, GameCardSkeleton } from '../components/GameCard';
import { GameRow } from '../components/GameRow';
import { LiveDot } from '../components/LiveDot';
import { useDashboard } from '../hooks/useDashboard';
import { formatClock, formatDateTitle } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import { hapticSelect } from '../lib/telegram';
import type { Game } from '../types';

type MobileTab = 'games' | 'feed';
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

type Section = { readonly key: string; readonly title: string; readonly games: Game[]; readonly live?: boolean };

function buildSections(games: Game[]): Section[] {
  const favorites = games.filter((g) => g.isFavorite);
  const rest = games.filter((g) => !g.isFavorite);
  return [
    { key: 'favorites', title: '★ הקבוצות שלי', games: favorites },
    { key: 'live', title: 'משחקים חיים', games: rest.filter((g) => g.status === 'live'), live: true },
    { key: 'scheduled', title: 'בהמשך היום', games: rest.filter((g) => g.status === 'scheduled') },
    { key: 'other', title: 'אחר', games: rest.filter((g) => g.status === 'other') },
    { key: 'finished', title: 'הסתיימו', games: rest.filter((g) => g.status === 'finished') },
  ].filter((s) => s.games.length > 0);
}

function ErrorState({ status, onRetry }: { readonly status: number; readonly onRetry: () => void }) {
  const unauthorized = status === 401 || status === 403;
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 px-6 text-center">
      <span className="text-4xl">{unauthorized ? '🔒' : '📡'}</span>
      <p className="text-base font-semibold">{unauthorized ? 'לא זוהית' : 'לא הצלחנו לטעון את המשחקים'}</p>
      <p className="text-sm text-text-secondary">{unauthorized ? 'פתח את הדשבורד דרך הפקודה /dashboard בבוט של Coach' : 'בדוק את החיבור ונסה שוב'}</p>
      {!unauthorized && (
        <button onClick={onRetry} className="mt-2 rounded-lg bg-accent-brand px-4 py-2 text-sm font-semibold">
          נסה שוב
        </button>
      )}
    </div>
  );
}

function IconButton({ onClick, label, children, spinning }: { readonly onClick: () => void; readonly label: string; readonly children: string; readonly spinning?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex size-9 items-center justify-center rounded-full bg-bg-elevated text-base text-text-secondary transition active:scale-95 hover:text-text-primary">
      <span className={spinning ? 'animate-spin' : ''}>{children}</span>
    </button>
  );
}

export function DashboardPage({ onOpenSettings }: { readonly onOpenSettings: () => void }) {
  const { data, loading, refreshing, errorStatus, refresh } = useDashboard();
  const [tab, setTab] = useState<MobileTab>('games');
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
  const visibleFeed = (data?.feed ?? []).filter((f) => activeFilter === null || f.competitionId === activeFilter);
  const sections = buildSections(visibleGames);
  const liveCount = games.filter((g) => g.status === 'live').length;

  const selectTab = (next: MobileTab) => {
    hapticSelect();
    setTab(next);
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              לייב
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-accent-live/15 px-2 py-0.5 text-xs font-bold text-accent-live">
                  <LiveDot />
                  {liveCount}
                </span>
              )}
            </h1>
            <span className="truncate text-xs text-text-muted">
              {data ? `${formatDateTitle(data.date)} · עודכן ${formatClock(data.updatedAt)}` : 'טוען…'}
            </span>
          </div>
          <IconButton onClick={toggleViewMode} label={viewMode === 'cards' ? 'תצוגת רשימה' : 'תצוגת כרטיסים'}>
            {viewMode === 'cards' ? '☰' : '▦'}
          </IconButton>
          <IconButton onClick={refresh} label="רענן" spinning={refreshing}>
            ↻
          </IconButton>
          <IconButton onClick={onOpenSettings} label="הגדרות">
            ⚙
          </IconButton>
        </div>
        {competitions.length > 1 && (
          <nav className="no-scrollbar mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pb-2.5">
            <button
              onClick={() => setCompetitionFilter(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${activeFilter === null ? 'bg-text-primary text-bg-base' : 'bg-bg-elevated text-text-secondary'}`}
            >
              הכל · {games.length}
            </button>
            {competitions.map((c) => (
              <button
                key={c.id}
                onClick={() => setCompetitionFilter(activeFilter === c.id ? null : c.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${activeFilter === c.id ? 'bg-text-primary text-bg-base' : 'bg-bg-elevated text-text-secondary'}`}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: leagueColor(c.id) }} />
                {c.name} · {c.count}
                {c.live > 0 && <LiveDot />}
              </button>
            ))}
          </nav>
        )}
        <div className="mx-auto flex max-w-[1500px] gap-1 px-4 pb-2 lg:hidden">
          {(['games', 'feed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => selectTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${tab === t ? 'bg-bg-elevated text-text-primary' : 'text-text-muted'}`}
            >
              {t === 'games' ? `משחקים (${visibleGames.length})` : `פיד אירועים (${visibleFeed.length})`}
            </button>
          ))}
        </div>
      </header>

      {errorStatus !== null && !data ? (
        <ErrorState status={errorStatus} onRetry={refresh} />
      ) : (
        <main className="mx-auto flex max-w-[1500px] gap-5 px-4 pt-4">
          <section className={`min-w-0 flex-1 flex-col gap-6 ${tab === 'games' ? 'flex' : 'hidden lg:flex'}`}>
            {errorStatus !== null && <p className="rounded-lg bg-accent-live/10 px-3 py-2 text-xs text-accent-live">הרענון האחרון נכשל, מוצגים נתונים קודמים</p>}
            {loading && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <GameCardSkeleton key={i} />
                ))}
              </div>
            )}
            {!loading && sections.length === 0 && (
              <div className="mt-12 flex flex-col items-center gap-2 text-center">
                <span className="text-4xl">🌙</span>
                <p className="font-semibold">אין היום משחקים בליגות שבחרת</p>
                <button onClick={onOpenSettings} className="text-sm text-accent-brand">
                  לבחירת ליגות וקבוצות
                </button>
              </div>
            )}
            {sections.map((section) => (
              <div key={section.key} className="flex flex-col gap-2.5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                  {section.live && <LiveDot />}
                  {section.title}
                  <span className="font-normal text-text-muted">{section.games.length}</span>
                </h2>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              </div>
            ))}
          </section>

          <aside className={`w-full shrink-0 lg:sticky lg:top-[120px] lg:block lg:max-h-[calc(100vh-136px)] lg:w-[360px] lg:overflow-y-auto lg:rounded-xl lg:bg-bg-card lg:p-2 ${tab === 'feed' ? 'block' : 'hidden'}`}>
            <h2 className="hidden px-2.5 pb-1 pt-1.5 text-sm font-bold text-text-secondary lg:block">פיד אירועים</h2>
            {loading ? <p className="py-8 text-center text-sm text-text-muted">טוען…</p> : <Feed items={visibleFeed} />}
          </aside>
        </main>
      )}
    </div>
  );
}
