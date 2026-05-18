import type { MatchSummary } from '../types';
import { leagueColor } from '../lib/league-themes';
import { teamLogo } from '../lib/logos';

export function MatchScoreboard({ match }: { match: MatchSummary }) {
  const stripe = leagueColor(match.competitionId);
  const kickoffTime = new Date(match.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden">
      <div style={{ background: stripe }} className="h-1.5 w-full" />
      <div className="p-6">
        <div className="grid grid-cols-3 items-center gap-3">
          <TeamColumn team={match.home} />
          <div className="text-center">
            {match.score ? (
              <div className="score-font text-3xl text-text-primary leading-none">
                {match.score.home}<span className="text-text-muted mx-2">-</span>{match.score.away}
              </div>
            ) : (
              <div className="score-font text-2xl text-text-secondary">{kickoffTime}</div>
            )}
            <StatusPill match={match} />
          </div>
          <TeamColumn team={match.away} />
        </div>
      </div>
    </div>
  );
}

function TeamColumn({ team }: { team: MatchSummary['home'] }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img src={teamLogo(team.id, 120)} alt="" loading="lazy" className="w-16 h-16" />
      <div className="text-text-primary font-bold text-sm leading-tight">{team.name}</div>
    </div>
  );
}

function StatusPill({ match }: { match: MatchSummary }) {
  if (match.status === 'live') {
    return (
      <div className="mt-2 inline-flex items-center gap-1 text-accent-live text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-live animate-live-pulse" />
        LIVE · {match.minute}'
      </div>
    );
  }
  if (match.status === 'finished') {
    return <div className="mt-2 text-text-secondary text-xs">הסתיים</div>;
  }
  return null;
}
