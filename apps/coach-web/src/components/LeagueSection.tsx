import { useLocation } from 'wouter';
import type { CompetitionRef, MatchSummary } from '../types';
import { MatchCard } from './MatchCard';

export function LeagueSection({ competition, matches }: { competition: CompetitionRef; matches: MatchSummary[] }) {
  const [, navigate] = useLocation();
  if (matches.length === 0) return null;
  return (
    <section className="space-y-2">
      <button
        onClick={() => navigate(`/league/${competition.id}`)}
        className="w-full text-right text-text-primary font-semibold text-sm tracking-wide flex items-center gap-2 px-1 hover:text-accent-win"
      >
        <span>{competition.icon}</span>
        <span>{competition.name}</span>
        <span className="text-text-muted">→</span>
      </button>
      <div className="space-y-2">
        {matches.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
    </section>
  );
}
