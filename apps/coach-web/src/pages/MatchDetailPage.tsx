import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { api } from '../lib/api';
import type { MatchDetailResponse } from '../types';
import { MatchScoreboard } from '../components/MatchScoreboard';
import { MatchInfo } from '../components/MatchInfo';
import { EventsTimeline } from '../components/EventsTimeline';
import { LineupsView } from '../components/LineupsView';
import { EmptyState } from '../components/EmptyState';
import { BackHeader } from '../components/BackHeader';
import { showBackButton } from '../lib/telegram';

export function MatchDetailPage() {
  const [, params] = useRoute('/match/:id');
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = Number(params?.id);

  const goBack = () => window.history.back();

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.match(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => showBackButton(goBack), []);

  const roundLine = data?.round
    ? [data.round.competition, data.round.round, data.round.roundNumber && `#${data.round.roundNumber}`].filter(Boolean).join(' · ')
    : '';

  return (
    <div className="min-h-full bg-bg-base">
      <BackHeader
        onBack={goBack}
        title={roundLine ? <span className="text-text-secondary text-xs truncate">{roundLine}</span> : undefined}
      />

      {error && <EmptyState title="לא הצלחתי לטעון" hint={error} />}
      {!error && !data && <EmptyState title="טוען..." />}

      {data && (
        <main className="p-4 space-y-4">
          <MatchScoreboard match={data.match} />
          <MatchInfo match={data.match} venue={data.venue} channel={data.channel} stage={data.stage} />
          <EventsTimeline events={[...data.events]} />
          {data.homeLineup && data.awayLineup && (
            <LineupsView
              home={{ team: data.match.home, lineup: data.homeLineup }}
              away={{ team: data.match.away, lineup: data.awayLineup }}
            />
          )}
        </main>
      )}
    </div>
  );
}
