import { GameSummaryRow } from '../components/GameSummaryRow';
import { PageHeader } from '../components/PageHeader';
import { PlayerPhoto } from '../components/PlayerPhoto';
import { TeamLogo } from '../components/TeamLogo';
import { Card, ErrorState, Loading, Section } from '../components/ui';
import { useResource } from '../hooks/useResource';
import { api } from '../lib/api';
import { navigate } from '../lib/router';

export function PlayerPage({ id }: { readonly id: number }) {
  const resource = useResource(() => api.player(id), `player:${id}`);
  const player = resource.data;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader back maxWidth="max-w-5xl" title={player?.name ?? 'Player'} />
      {resource.errorStatus !== null && !player ? (
        <ErrorState status={resource.errorStatus} onRetry={resource.reload} />
      ) : !player ? (
        <Loading />
      ) : (
        <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-4">
          <Card className="flex items-center gap-4 p-5">
            <PlayerPhoto athleteId={player.id} name={player.name} size={80} />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="truncate text-xl font-bold">{player.name}</h2>
              <span className="text-sm text-text-secondary">{[player.position, player.jerseyNumber != null ? `#${player.jerseyNumber}` : undefined, player.age != null ? `${player.age} yrs` : undefined].filter(Boolean).join(' · ')}</span>
              {player.clubId && (
                <button onClick={() => navigate({ name: 'team', id: player.clubId! })} className="flex items-center gap-1.5 self-start text-sm text-accent-brand hover:underline">
                  <TeamLogo teamId={player.clubId} name="Club" size={18} />
                  Club page →
                </button>
              )}
            </div>
          </Card>

          {player.details.length > 0 && (
            <Card className="flex flex-wrap gap-px bg-border-subtle">
              {player.details.map((d) => (
                <div key={d.title} className="flex min-w-[40%] flex-1 basis-0 flex-col sm:min-w-[22%] gap-0.5 bg-bg-card px-4 py-3">
                  <span className="text-[11px] text-text-muted">{d.title}</span>
                  <span className="truncate text-sm font-semibold">{d.value}</span>
                </div>
              ))}
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {player.seasonStats.length > 0 && (
              <Section title="This season">
                <div className="flex flex-col gap-3">
                  {player.seasonStats.map((s) => (
                    <Card key={s.competitionName}>
                      <h3 className="border-b border-border-subtle px-4 py-2 text-sm font-bold">{s.competitionName}</h3>
                      <div className="grid grid-cols-3 gap-px bg-border-subtle">
                        {s.stats.map((stat) => (
                          <div key={stat.name} className="flex flex-col items-center gap-0.5 bg-bg-card px-2 py-3 text-center">
                            <span className="score-font text-lg">{stat.value}</span>
                            <span className="text-[11px] text-text-muted">{stat.name}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>
            )}
            {player.recentGames.length > 0 && (
              <Section title="Recent games">
                <Card className="divide-y divide-border-subtle">
                  {player.recentGames.map((g) => (
                    <GameSummaryRow key={g.id} game={g} stats={g.stats} />
                  ))}
                </Card>
              </Section>
            )}
          </div>
          {player.bio && <p className="text-sm leading-relaxed text-text-secondary">{player.bio}</p>}
        </main>
      )}
    </div>
  );
}
