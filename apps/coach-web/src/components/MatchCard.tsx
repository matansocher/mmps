import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import type { MatchSummary, TeamRef } from '../types';
import { leagueColor } from '../lib/league-themes';
import { teamLogo } from '../lib/logos';
import { formatMatchDate } from '../lib/format';

export function MatchCard({ match, showDate = false }: { match: MatchSummary; showDate?: boolean }) {
  const [, navigate] = useLocation();
  const stripe = leagueColor(match.competitionId);
  const kickoff = new Date(match.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full bg-bg-card border border-border-subtle rounded-xl flex items-stretch overflow-hidden hover:bg-bg-elevated transition-colors"
    >
      <div style={{ background: stripe }} className="w-1" />
      <div className="flex-1 p-3">
        {showDate && (
          <div className="text-text-muted text-[10px] font-medium mb-1.5 tracking-wide">
            {formatMatchDate(match.startTime)}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide team={match.home} align="end" />
          <CenterStatus match={match} kickoff={kickoff} />
          <TeamSide team={match.away} align="start" />
        </div>
      </div>
    </motion.button>
  );
}

function TeamSide({ team, align }: { team: TeamRef; align: 'start' | 'end' }) {
  const flex = align === 'end' ? 'flex-row' : 'flex-row-reverse';
  return (
    <div className={`flex items-center gap-2 min-w-0 ${flex}`}>
      <span className="text-text-primary text-sm font-medium truncate">{team.name}</span>
      <img src={teamLogo(team.id)} alt="" loading="lazy" className="w-7 h-7 shrink-0" />
    </div>
  );
}

function CenterStatus({ match, kickoff }: { match: MatchSummary; kickoff: string }) {
  if (match.status === 'scheduled') {
    return <span className="text-text-secondary score-font text-sm whitespace-nowrap">{kickoff}</span>;
  }
  if (match.status === 'finished' && match.score) {
    return (
      <div className="text-center">
        <div className="score-font text-text-primary text-lg leading-none">
          {match.score.home}<span className="text-text-muted mx-1">-</span>{match.score.away}
        </div>
        <div className="text-text-secondary text-[10px] mt-0.5">FT</div>
      </div>
    );
  }
  if (match.status === 'live' && match.score) {
    return (
      <div className="text-center">
        <div className="score-font text-accent-win text-lg leading-none">
          {match.score.home}<span className="text-text-muted mx-1">-</span>{match.score.away}
        </div>
        <div className="text-accent-live text-[10px] mt-0.5 flex items-center gap-1 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-live animate-live-pulse" />
          {match.minute}'
        </div>
      </div>
    );
  }
  return null;
}
