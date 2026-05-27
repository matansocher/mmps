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
          <TeamSide team={match.home} align="end" kind="home" />
          <CenterStatus match={match} kickoff={kickoff} />
          <TeamSide team={match.away} align="start" kind="away" />
        </div>
      </div>
    </motion.button>
  );
}

function TeamSide({ team, align, kind }: { team: TeamRef; align: 'start' | 'end'; kind: 'home' | 'away' }) {
  // Page is RTL. align="end" = home (outer edge = right). align="start" = away (outer edge = left).
  // Goal: team logo on the outer edge, team name + home/away indicator hugging the center (next to kickoff time).
  // In RTL: flex-row reads right-to-left; flex-row-reverse reads left-to-right.
  const dir = align === 'end' ? 'flex-row' : 'flex-row-reverse';
  return (
    <div className={`flex items-center justify-between gap-2 min-w-0 ${dir}`}>
      <img src={teamLogo(team.id)} alt="" loading="lazy" className="w-7 h-7 shrink-0" />
      <div className={`flex items-center gap-1.5 min-w-0 ${dir}`}>
        <span className="text-text-primary text-sm font-medium truncate">{team.name}</span>
        <SideIndicator kind={kind} />
      </div>
    </div>
  );
}

function SideIndicator({ kind }: { kind: 'home' | 'away' }) {
  const common = 'w-3.5 h-3.5 shrink-0 text-text-muted';
  if (kind === 'home') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="בית">
        <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="חוץ">
      <path d="M17.8 19.2 16 11l3.5-3.5a2.121 2.121 0 0 0-3-3L13 8 4.8 6.2 3 8l8 4-4 4-3-1-1 1 4 2 2 4 1-1-1-3 4-4 4 8 1.8-1.8Z" />
    </svg>
  );
}

function ScorePair({ home, away, color }: { home: number; away: number; color: string }) {
  return (
    <div className={`score-font text-lg leading-none flex items-center justify-center ${color}`}>
      <span>{home}</span>
      <span className="text-text-muted mx-1">-</span>
      <span>{away}</span>
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
        <ScorePair home={match.score.home} away={match.score.away} color="text-text-primary" />
        <div className="text-text-secondary text-[10px] mt-0.5">FT</div>
      </div>
    );
  }
  if (match.status === 'live' && match.score) {
    return (
      <div className="text-center">
        <ScorePair home={match.score.home} away={match.score.away} color="text-accent-win" />
        <div className="text-accent-live text-[10px] mt-0.5 flex items-center gap-1 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-live animate-live-pulse" />
          {match.minute}'
        </div>
      </div>
    );
  }
  return null;
}

export function MatchCardSkeleton() {
  return (
    <div className="w-full bg-bg-card border border-border-subtle rounded-xl flex items-stretch overflow-hidden animate-pulse">
      <div className="w-1 bg-bg-elevated" />
      <div className="flex-1 p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-7 h-7 rounded-full bg-bg-elevated shrink-0" />
            <div className="h-3 bg-bg-elevated rounded w-20" />
          </div>
          <div className="h-4 w-10 bg-bg-elevated rounded" />
          <div className="flex items-center justify-between gap-2 flex-row-reverse">
            <div className="w-7 h-7 rounded-full bg-bg-elevated shrink-0" />
            <div className="h-3 bg-bg-elevated rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
