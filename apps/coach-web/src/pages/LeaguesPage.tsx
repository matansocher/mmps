import { LiveDot } from '../components/LiveDot';
import { PageHeader } from '../components/PageHeader';
import { Card, Loading, Section } from '../components/ui';
import { useCompetitions } from '../hooks/useCompetitions';
import { useDashboard } from '../hooks/useDashboard';
import { leagueColor } from '../lib/league-themes';
import { navigate } from '../lib/router';
import type { CompetitionOption } from '../types';

function LeagueRow({ competition, todayCount, liveCount }: { readonly competition: CompetitionOption; readonly todayCount: number; readonly liveCount: number }) {
  return (
    <button onClick={() => navigate({ name: 'league', id: competition.id })} className="relative flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-bg-elevated/60">
      <span className="absolute inset-y-2 start-0 w-1 rounded-e" style={{ backgroundColor: leagueColor(competition.id) }} />
      <span className="text-lg">{competition.icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{competition.name}</span>
      {liveCount > 0 && (
        <span className="flex items-center gap-1.5 text-xs font-bold text-accent-live">
          <LiveDot />
          {liveCount}
        </span>
      )}
      {todayCount > 0 && <span className="text-xs text-text-muted">{todayCount} today</span>}
      <span className="text-text-muted">›</span>
    </button>
  );
}

export function LeaguesPage() {
  const competitions = useCompetitions();
  const { data } = useDashboard();
  const followed = new Set(data?.preferences.competitionIds ?? []);
  const games = data?.games ?? [];
  const counts = (id: number) => ({ todayCount: games.filter((g) => g.competitionId === id).length, liveCount: games.filter((g) => g.competitionId === id && g.status === 'live').length });
  const mine = competitions?.filter((c) => followed.has(c.id)) ?? [];
  const others = competitions?.filter((c) => !followed.has(c.id)) ?? [];

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader title="Leagues" subtitle="Tables and knockout brackets" maxWidth="max-w-3xl" />
      {!competitions ? (
        <Loading />
      ) : (
        <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-4">
          {mine.length > 0 && (
            <Section title="Following">
              <Card className="divide-y divide-border-subtle">
                {mine.map((c) => (
                  <LeagueRow key={c.id} competition={c} {...counts(c.id)} />
                ))}
              </Card>
            </Section>
          )}
          {others.length > 0 && (
            <Section title={mine.length ? 'More leagues' : 'All leagues'}>
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
