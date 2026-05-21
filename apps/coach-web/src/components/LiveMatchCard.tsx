import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import type { MatchSummary } from '../types';
import { leagueColor } from '../lib/league-themes';
import { teamLogo } from '../lib/logos';

export function LiveMatchCard({ match }: { match: MatchSummary }) {
  const [, navigate] = useLocation();
  const stripe = leagueColor(match.competitionId);
  if (match.status !== 'live' || !match.score) return null;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full bg-bg-card border border-border-subtle rounded-2xl flex items-stretch overflow-hidden"
    >
      <div style={{ background: stripe }} className="w-1.5" />
      <div className="flex-1 p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-text-primary font-semibold truncate">{match.home.name}</span>
          <img src={teamLogo(match.home.id, 80)} alt="" loading="lazy" className="w-10 h-10 shrink-0" />
        </div>
        <div className="text-center">
          <div className="score-font text-3xl text-accent-win leading-none flex items-center justify-center">
            <span>{match.score.home}</span>
            <span className="text-text-muted mx-2">-</span>
            <span>{match.score.away}</span>
          </div>
          <div className="text-accent-live text-xs mt-2 flex items-center gap-1 justify-center">
            <span className="w-2 h-2 rounded-full bg-accent-live animate-live-pulse" />
            {match.minute}'
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
          <span className="text-text-primary font-semibold truncate">{match.away.name}</span>
          <img src={teamLogo(match.away.id, 80)} alt="" loading="lazy" className="w-10 h-10 shrink-0" />
        </div>
      </div>
    </motion.button>
  );
}
