import { useState } from 'react';
import { BracketView } from '../components/BracketView';
import { GameRow } from '../components/GameRow';
import { PageHeader } from '../components/PageHeader';
import { LiveTableNote, StandingsTableView, ZonesLegend } from '../components/StandingsTableView';
import { ErrorState, Loading, Section, Tabs } from '../components/ui';
import { useDashboard } from '../hooks/useDashboard';
import { useLiveCompetition } from '../hooks/useLiveCompetition';

type LeagueTab = 'table' | 'knockout';

export function LeaguePage({ id }: { readonly id: number }) {
  const resource = useLiveCompetition(id);
  const { data: dashboard } = useDashboard();
  const [tab, setTab] = useState<LeagueTab | null>(null);
  const competition = resource.data;
  const todayGames = dashboard?.games.filter((g) => g.competitionId === id) ?? [];
  const favoriteIds = dashboard?.preferences.favoriteTeams.map((t) => t.id) ?? [];

  const tabs: { id: LeagueTab; label: string }[] = [];
  if (competition?.tables.length) tabs.push({ id: 'table', label: competition.tables.length > 1 ? 'Groups' : 'Table' });
  if (competition?.knockout.length) tabs.push({ id: 'knockout', label: 'Knockout' });
  const activeTab = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader back maxWidth="max-w-5xl" title={competition ? `${competition.icon} ${competition.name}` : 'League'} />
      {resource.errorStatus !== null && !competition ? (
        <ErrorState status={resource.errorStatus} onRetry={resource.reload} />
      ) : !competition ? (
        <Loading />
      ) : (
        <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-4">
          {todayGames.length > 0 && (
            <Section title="Today">
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {todayGames.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
              </div>
            </Section>
          )}
          {tabs.length > 1 && <Tabs tabs={tabs} active={activeTab!} onChange={setTab} />}
          {tabs.length === 0 && <p className="py-10 text-center text-sm text-text-muted">No table or bracket available yet</p>}
          {activeTab === 'table' && (
            <div className={`grid gap-3 ${competition.tables.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              <div className="lg:col-span-full">
                <LiveTableNote tables={competition.tables} />
              </div>
              {competition.tables.map((table, i) => (
                <StandingsTableView key={table.name ?? i} table={table} highlightIds={favoriteIds} showForm={competition.tables.length === 1} />
              ))}
              <div className="lg:col-span-full">
                <ZonesLegend zones={competition.zones} />
              </div>
            </div>
          )}
          {activeTab === 'knockout' && <BracketView stages={competition.knockout} />}
        </main>
      )}
    </div>
  );
}
