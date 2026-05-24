import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { api } from '../lib/api';
import { showBackButton } from '../lib/telegram';
import type { MatchDetailResponse, MatchDto } from '../lib/types';
import { EventsTimeline } from '../components/EventsTimeline';
import { LineupsView } from '../components/LineupsView';
import { GuessSheet } from '../components/GuessSheet';
import { H2HSection } from '../components/H2HSection';
import { getTeamImageUrl } from '../data/player-images';

export function MatchDetailPage() {
  const [, params] = useRoute('/match/:id');
  const [, navigate] = useLocation();
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [guessMatch, setGuessMatch] = useState<MatchDto | null>(null);
  const id = Number(params?.id);

  function load(silent = false) {
    if (!Number.isFinite(id)) return;
    if (!silent) setLoading(true);
    api.matchDetail(id).then(setData).catch(() => { if (!silent) setData(null); }).finally(() => { if (!silent) setLoading(false); });
  }

  useEffect(() => { load(); }, [id]);

  // Auto-refresh every 20s when match is live
  useEffect(() => {
    if (!data || data.match.status !== 'live') return;
    const interval = setInterval(() => load(true), 20_000);
    return () => clearInterval(interval);
  }, [data?.match.status, id]);

  useEffect(() => {
    return showBackButton(() => navigate('/'));
  }, [navigate]);

  function handleGuessSubmitted() {
    load();
    setGuessMatch(null);
  }

  if (loading) return <div className="p-6 text-text-muted text-center">טוען...</div>;
  if (!data) return <div className="p-6 text-text-muted text-center">לא נמצא משחק</div>;

  const { match } = data;
  const isScheduled = match.status === 'scheduled';
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  const time = new Date(match.startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', timeStyle: 'short' });
  const dateStr = new Date(match.startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-full bg-bg-base">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-accent-exact text-sm">→ חזרה</button>
          <span className="text-text-muted text-xs">{match.stage}</span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Scoreboard */}
        <div className="bg-bg-card rounded-xl p-5 border border-border-subtle text-center">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center cursor-pointer" onClick={() => navigate(`/teams/${match.home.id}`)}>
              <img src={getTeamImageUrl(match.home.id, 48)} alt="" className="w-12 h-12 rounded-full mx-auto mb-1" />
              <div className="text-base font-bold">{match.home.name}</div>
              {(isFinished || isLive) && <div className="score-font text-4xl mt-2">{match.home.score}</div>}
            </div>
            <div className="px-4">
              {isLive && <span className="text-accent-live text-sm font-bold animate-pulse">LIVE</span>}
              {isScheduled && <span className="text-text-muted text-xl">vs</span>}
              {isFinished && <span className="text-text-muted text-sm">FT</span>}
            </div>
            <div className="flex-1 text-center cursor-pointer" onClick={() => navigate(`/teams/${match.away.id}`)}>
              <img src={getTeamImageUrl(match.away.id, 48)} alt="" className="w-12 h-12 rounded-full mx-auto mb-1" />
              <div className="text-base font-bold">{match.away.name}</div>
              {(isFinished || isLive) && <div className="score-font text-4xl mt-2">{match.away.score}</div>}
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle space-y-2">
          <InfoRow icon="📅" label={dateStr} />
          <InfoRow icon="⏰" label={time} />
          {data.venue && <InfoRow icon="🏟️" label={data.venue} />}
          {data.channel && <InfoRow icon="📺" label={data.channel} />}
          {data.stage && <InfoRow icon="🏆" label={data.stage} />}
        </div>

        {/* Guess section */}
        {match.myGuess && (
          <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-text-secondary">🎯 הניחוש שלי:</span>
              <span className="score-font text-base" dir="ltr">{match.myGuess.home} - {match.myGuess.away}</span>
              {match.myGuess.points !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${match.myGuess.points === 5 ? 'bg-accent-exact' : match.myGuess.points === 3 ? 'bg-accent-gd' : match.myGuess.points === 1 ? 'bg-accent-result' : 'bg-accent-wrong'} text-black`}>
                  +{match.myGuess.points}
                </span>
              )}
            </div>
          </div>
        )}

        {isScheduled && (
          <button
            onClick={() => setGuessMatch(match)}
            className="w-full bg-accent-exact/15 text-accent-exact text-sm font-medium py-3 rounded-xl hover:bg-accent-exact/25 transition"
          >
            {match.myGuess ? '✏️ עריכת ניחוש' : '🎯 ניחוש'}
          </button>
        )}

        {/* H2H section for scheduled matches */}
        {isScheduled && <H2HSection matchId={id} homeName={match.home.name} awayName={match.away.name} />}

        {/* Events */}
        {data.events.length > 0 && <EventsTimeline events={data.events} />}

        {/* Lineups */}
        {data.homeLineup && data.awayLineup && (
          <LineupsView
            home={{ name: match.home.name, lineup: data.homeLineup }}
            away={{ name: match.away.name, lineup: data.awayLineup }}
          />
        )}
      </main>

      <GuessSheet match={guessMatch} onClose={() => setGuessMatch(null)} onSubmitted={handleGuessSubmitted} />
    </div>
  );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{icon}</span>
      <span className="text-text-primary">{label}</span>
    </div>
  );
}
