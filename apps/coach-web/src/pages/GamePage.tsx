import { messages } from '../lib/i18n';
import { type ReactNode, useEffect, useState } from 'react';
import { ChannelBadge } from '../components/ChannelBadge';
import { CompetitionLogo } from '../components/CompetitionLogo';
import { EventsTimeline } from '../components/EventsTimeline';
import { HeadToHeadView } from '../components/HeadToHeadView';
import { LineupsView } from '../components/LineupsView';
import { PageHeader } from '../components/PageHeader';
import { Scoreboard } from '../components/Scoreboard';
import { LiveTableNote, StandingsTableView, ZonesLegend } from '../components/StandingsTableView';
import { StatsList } from '../components/StatsList';
import { Card, ErrorState, ForwardArrow, Loading, Section, Tabs } from '../components/ui';
import { useCompetitions } from '../hooks/useCompetitions';
import { useLiveCompetition } from '../hooks/useLiveCompetition';
import { useResource } from '../hooks/useResource';
import { api } from '../lib/api';
import { formatLongDate, formatKickoff } from '../lib/format';
import { teamColors } from '../lib/league-themes';
import { LIVE_POLL_MS } from '../lib/polling';
import { navigate } from '../lib/router';
import type { GameDetail } from '../types';
import { Icon } from '../components/Icon';

type GameTab = 'overview' | 'lineups' | 'table';

function InfoRow({ icon, label, children }: { readonly icon: ReactNode; readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="w-20 shrink-0 text-text-secondary">{label}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}

function GameInfo({ detail, competitionLinked }: { readonly detail: GameDetail; readonly competitionLinked: boolean }) {
  const { game } = detail;
  return (
    <Card className="divide-y divide-border-subtle">
      <InfoRow icon={<CompetitionLogo competitionId={game.competitionId} size={16} />} label={messages().game.competition}>
        {competitionLinked ? (
          <button onClick={() => navigate({ name: 'league', id: game.competitionId })} className="text-accent-brand hover:underline">
            {game.competitionName}
          </button>
        ) : (
          game.competitionName
        )}
        {detail.round && <span className="text-text-secondary"> · {detail.round}</span>}
      </InfoRow>
      <InfoRow icon={<Icon name="calendar" size={16} className="text-text-muted" />} label={messages().game.kickoff}>
        {formatLongDate(game.startTime)} · {formatKickoff(game.startTime)}
      </InfoRow>
      {game.channels.length > 0 && (
        <InfoRow icon={<Icon name="tv" size={16} className="text-text-muted" />} label={messages().game.tv}>
          <span className="flex min-w-0">
            <ChannelBadge channels={game.channels} />
          </span>
        </InfoRow>
      )}
      {detail.venue && (
        <InfoRow icon={<Icon name="stadium" size={16} className="text-text-muted" />} label={messages().game.venue}>
          {detail.venue}
        </InfoRow>
      )}
      {detail.referee && (
        <InfoRow icon={<Icon name="whistle" size={16} className="text-text-muted" />} label={messages().game.referee}>
          {detail.referee}
        </InfoRow>
      )}
    </Card>
  );
}

function GameTable({ detail }: { readonly detail: GameDetail }) {
  const { game } = detail;
  const competition = useLiveCompetition(game.competitionId);
  if (competition.errorStatus !== null) return <ErrorState status={competition.errorStatus} onRetry={competition.reload} />;
  if (!competition.data) return <Loading />;
  const teamIds = [game.home.id, game.away.id];
  const tables = competition.data.tables.filter((t) => t.rows.some((r) => teamIds.includes(r.team.id)));
  if (!tables.length) return <p className="py-10 text-center text-sm text-text-secondary">{messages().game.noTable}</p>;
  return (
    <div className="flex flex-col gap-3">
      <LiveTableNote tables={tables} />
      {tables.map((table, i) => (
        <StandingsTableView key={table.name ?? i} table={table} highlightIds={teamIds} />
      ))}
      <ZonesLegend zones={competition.data.zones} />
      <button onClick={() => navigate({ name: 'league', id: game.competitionId })} className="py-2 text-sm font-semibold text-accent-brand">
        {messages().game.openCompetition(competition.data.name)} <ForwardArrow />
      </button>
    </div>
  );
}

export function GamePage({ id }: { readonly id: number }) {
  const [isLive, setIsLive] = useState(false);
  const resource = useResource(() => api.game(id), `game:${id}`, isLive ? LIVE_POLL_MS : undefined);
  const competitions = useCompetitions();
  const [tab, setTab] = useState<GameTab>('overview');
  const detail = resource.data;

  useEffect(() => setIsLive(detail?.game.status === 'live'), [detail]);

  const tabs: { id: GameTab; label: string }[] = [{ id: 'overview', label: messages().game.overview }];
  if (detail?.lineups) tabs.push({ id: 'lineups', label: messages().game.lineups });
  if (detail?.hasStandings) tabs.push({ id: 'table', label: messages().game.table });
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview';
  const competitionLinked = !!detail && !!competitions?.some((c) => c.id === detail.game.competitionId);

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <PageHeader
        back
        maxWidth="max-w-5xl"
        title={detail ? messages().game.titleTeams(detail.game.home.shortName || detail.game.home.name, detail.game.away.shortName || detail.game.away.name) : messages().game.title}
        subtitle={detail ? `${detail.game.competitionName}${detail.round ? ` · ${detail.round}` : ''}` : undefined}
      />
      {resource.errorStatus !== null && !detail ? (
        <ErrorState status={resource.errorStatus} onRetry={resource.reload} />
      ) : !detail ? (
        <Loading />
      ) : (
        <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-4">
          <Scoreboard game={detail.game} halftimeScore={detail.halftimeScore} />
          {tabs.length > 1 && <Tabs tabs={tabs} active={activeTab} onChange={setTab} />}
          {activeTab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <GameInfo detail={detail} competitionLinked={competitionLinked} />
                {detail.game.status !== 'scheduled' && (
                  <Section title={messages().game.timeline}>
                    <Card>
                      <EventsTimeline events={detail.timeline} />
                    </Card>
                  </Section>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {/* Before kick-off there's no timeline or stats, so form and head-to-head move up. */}
                {detail.game.status !== 'scheduled' && (
                  <Section title={messages().game.stats}>
                    <Card>
                      <StatsList stats={detail.stats} colors={teamColors(detail.game.home.color, detail.game.away.color)} />
                    </Card>
                  </Section>
                )}
                {detail.headToHead && <HeadToHeadView headToHead={detail.headToHead} home={detail.game.home} away={detail.game.away} />}
              </div>
            </div>
          )}
          {activeTab === 'lineups' && detail.lineups && <LineupsView home={detail.game.home} away={detail.game.away} lineups={detail.lineups} />}
          {activeTab === 'table' && <GameTable detail={detail} />}
        </main>
      )}
    </div>
  );
}
