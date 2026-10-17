import { messages } from '../lib/i18n';
import { useState } from 'react';
import { GameSummaryRow } from '../components/GameSummaryRow';
import { PageHeader } from '../components/PageHeader';
import { PlayerPhoto } from '../components/PlayerPhoto';
import { TeamLogo } from '../components/TeamLogo';
import { Card, ErrorState, FormBadge, ForwardArrow, Loading, Section, Tabs } from '../components/ui';
import { useCompetitions } from '../hooks/useCompetitions';
import { useResource } from '../hooks/useResource';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import type { SquadPlayer, TeamDetail } from '../types';

type TeamTab = 'matches' | 'squad';

function groupSquad(squad: readonly SquadPlayer[]): [string, SquadPlayer[]][] {
  const groups = new Map<string, SquadPlayer[]>();
  for (const player of squad) groups.set(player.position, [...(groups.get(player.position) ?? []), player]);
  return [...groups.entries()];
}

function TeamHeader({ team, competitionLinked }: { readonly team: TeamDetail; readonly competitionLinked: boolean }) {
  const form = team.recent.flatMap((g) => (g.result ? [g.result] : [])).slice(0, 5);
  const color = team.color || '#1b2330';
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-card">
      <div className="flex items-center gap-4 p-5" style={{ background: `linear-gradient(135deg, ${color}55, transparent 70%)` }}>
        <TeamLogo teamId={team.id} name={team.name} size={64} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="truncate text-xl font-bold">{team.longName || team.name}</h2>
          {team.mainCompetitionName &&
            (competitionLinked && team.mainCompetitionId ? (
              <button onClick={() => navigate({ name: 'league', id: team.mainCompetitionId! })} className="self-start text-sm text-accent-brand hover:underline">
                {team.mainCompetitionName} <ForwardArrow />
              </button>
            ) : (
              <span className="text-sm text-text-secondary">{team.mainCompetitionName}</span>
            ))}
          {form.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="me-1 text-xs text-text-muted">{messages().common.form}</span>
              {form.map((r, i) => (
                <FormBadge key={i} result={r} />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamPage({ id }: { readonly id: number }) {
  const resource = useResource(() => api.team(id), `team:${id}`);
  const competitions = useCompetitions();
  const [tab, setTab] = useState<TeamTab>('matches');
  const team = resource.data;
  const competitionLinked = !!team?.mainCompetitionId && !!competitions?.some((c) => c.id === team.mainCompetitionId);

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader back maxWidth="max-w-5xl" title={team?.name ?? messages().team.title} />
      {resource.errorStatus !== null && !team ? (
        <ErrorState status={resource.errorStatus} onRetry={resource.reload} />
      ) : !team ? (
        <Loading />
      ) : (
        <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-4">
          <TeamHeader team={team} competitionLinked={competitionLinked} />
          <Tabs
            tabs={[
              { id: 'matches', label: messages().team.matches },
              { id: 'squad', label: messages().common.count(messages().team.squad, team.squad.length) },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === 'matches' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title={messages().team.upcoming}>
                <Card className="divide-y divide-border-subtle">
                  {team.upcoming.length ? team.upcoming.map((g) => <GameSummaryRow key={g.id} game={g} />) : <p className="px-4 py-6 text-center text-sm text-text-muted">{messages().team.noUpcoming}</p>}
                </Card>
              </Section>
              <Section title={messages().team.recent}>
                <Card className="divide-y divide-border-subtle">
                  {team.recent.length ? team.recent.map((g) => <GameSummaryRow key={g.id} game={g} />) : <p className="px-4 py-6 text-center text-sm text-text-muted">{messages().team.noRecent}</p>}
                </Card>
              </Section>
            </div>
          )}
          {tab === 'squad' && (
            <div className="grid gap-4 md:grid-cols-2">
              {groupSquad(team.squad).map(([position, players]) => (
                <Section key={position} title={`${position} · ${players.length}`}>
                  <Card className="divide-y divide-border-subtle">
                    {players.map((p) => (
                      <button key={p.athleteId} onClick={() => navigate({ name: 'player', id: p.athleteId })} className="flex w-full items-center gap-3 px-3 py-2 text-start transition hover:bg-bg-elevated/60">
                        <span className="score-font w-6 shrink-0 text-center text-xs text-text-muted">{p.jerseyNumber ?? ''}</span>
                        <PlayerPhoto athleteId={p.athleteId} name={p.name} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                        {p.age != null && <span className="shrink-0 text-xs text-text-muted">{messages().common.years(p.age)}</span>}
                      </button>
                    ))}
                  </Card>
                </Section>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
