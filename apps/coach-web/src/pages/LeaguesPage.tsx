import { useEffect, useState } from 'react';
import { messages } from '../lib/i18n';
import { api } from '../lib/api';
import { Icon } from '../components/Icon';
import { CompetitionLogo } from '../components/CompetitionLogo';
import { LiveDot } from '../components/LiveDot';
import { PageHeader } from '../components/PageHeader';
import { Card, Loading, Section } from '../components/ui';
import { useCompetitions } from '../hooks/useCompetitions';
import { useDashboard } from '../hooks/useDashboard';
import { leagueColor } from '../lib/league-themes';
import { navigate } from '../lib/router';
import type { CompetitionOption } from '../types';

type RowProps = { readonly competition: CompetitionOption; readonly todayCount: number; readonly liveCount: number; readonly favoriteCount: number };

function LeagueRow({ competition, todayCount, liveCount, favoriteCount }: RowProps) {
  return (
    <button onClick={() => navigate({ name: 'league', id: competition.id })} className="relative flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-row-hover">
      <span className="absolute inset-y-2 start-0 w-1 rounded-e" style={{ backgroundColor: leagueColor(competition.id) }} />
      <CompetitionLogo competitionId={competition.id} size={24} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-sm font-semibold">{competition.name}</span>
        {favoriteCount > 0 && (
          <span className="flex shrink-0 items-center gap-1 self-center text-xs text-text-secondary">
            <Icon name="star" size={11} className="text-accent-fav" />
            {messages().leagues.yourTeams(favoriteCount)}
          </span>
        )}
      </span>
      {liveCount > 0 && (
        <span className="flex items-center gap-1.5 text-xs font-bold text-accent-live">
          <LiveDot />
          {liveCount}
        </span>
      )}
      {todayCount > 0 && <span className="text-xs text-text-secondary">{messages().leagues.today(todayCount)}</span>}
      <span aria-hidden className="inline-block text-text-muted rtl:-scale-x-100">›</span>
    </button>
  );
}

export function LeaguesPage() {
  const competitions = useCompetitions();
  const { data } = useDashboard();
  const favoriteKey = (data?.preferences.favoriteTeams ?? []).map((t) => t.id).join(',');
  const [favoriteCounts, setFavoriteCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!favoriteKey) return;
    let active = true;
    (async () => {
      try {
        const counts = await api.favoriteTeamCounts();
        if (active) setFavoriteCounts(counts);
      } catch {
        // The counts are a nice-to-have; the list works without them.
      }
    })();
    return () => {
      active = false;
    };
  }, [favoriteKey]);

  const followed = new Set(data?.preferences.competitionIds ?? []);
  const games = data?.games ?? [];
  const counts = (id: number) => ({
    todayCount: games.filter((g) => g.competitionId === id).length,
    liveCount: games.filter((g) => g.competitionId === id && g.status === 'live').length,
    favoriteCount: favoriteKey ? (favoriteCounts[id] ?? 0) : 0,
  });
  const mine = competitions?.filter((c) => followed.has(c.id)) ?? [];
  const others = competitions?.filter((c) => !followed.has(c.id)) ?? [];

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader title={messages().leagues.title} subtitle={messages().leagues.subtitle} maxWidth="max-w-3xl" />
      {!competitions ? (
        <Loading />
      ) : (
        <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-4">
          {mine.length > 0 && (
            <Section title={messages().leagues.following}>
              <Card className="divide-y divide-border-subtle">
                {mine.map((c) => (
                  <LeagueRow key={c.id} competition={c} {...counts(c.id)} />
                ))}
              </Card>
            </Section>
          )}
          {others.length > 0 && (
            <Section title={mine.length ? messages().leagues.more : messages().leagues.all}>
              <Card className="divide-y divide-border-subtle">
                {others.map((c) => (
                  <LeagueRow key={c.id} competition={c} {...counts(c.id)} />
                ))}
              </Card>
            </Section>
          )}
        </main>
      )}
    </div>
  );
}
