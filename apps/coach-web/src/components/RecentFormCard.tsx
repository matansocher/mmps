import type { TeamRecentMatch, TeamRef } from '../types';
import { teamLogo } from '../lib/logos';

const OUTCOME_STYLE: Record<TeamRecentMatch['outcome'], string> = {
  W: 'bg-accent-win/15 text-accent-win',
  D: 'bg-text-muted/15 text-text-secondary',
  L: 'bg-accent-loss/15 text-accent-loss',
};

const OUTCOME_LABEL: Record<TeamRecentMatch['outcome'], string> = { W: 'נ', D: 'ת', L: 'ה' };

type Props = {
  home: { team: TeamRef; matches: readonly TeamRecentMatch[] };
  away: { team: TeamRef; matches: readonly TeamRecentMatch[] };
  onSelect: (matchId: number) => void;
};

export function RecentFormCard({ home, away, onSelect }: Props) {
  if (home.matches.length === 0 && away.matches.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-text-secondary text-sm font-semibold px-1">5 משחקים אחרונים</h2>
      <div className="grid grid-cols-2 gap-2">
        <TeamColumn team={home.team} matches={home.matches} onSelect={onSelect} />
        <TeamColumn team={away.team} matches={away.matches} onSelect={onSelect} />
      </div>
    </section>
  );
}

function TeamColumn({ team, matches, onSelect }: { team: TeamRef; matches: readonly TeamRecentMatch[]; onSelect: (matchId: number) => void }) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-2 bg-bg-elevated/40 border-b border-border-subtle">
        <img src={teamLogo(team.id, 32)} alt="" className="w-5 h-5 shrink-0" loading="lazy" />
        <span className="text-text-primary text-xs font-medium truncate">{team.name}</span>
      </div>
      {matches.length === 0 ? (
        <div className="px-2.5 py-3 text-text-muted text-[11px] text-center">אין נתונים</div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {matches.map((m) => (
            <RecentRow key={m.id} match={m} teamId={team.id} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentRow({ match, teamId, onSelect }: { match: TeamRecentMatch; teamId: number; onSelect: (matchId: number) => void }) {
  const isHome = match.home.id === teamId;
  const opponent = isHome ? match.away : match.home;
  const myScore = isHome ? match.score?.home : match.score?.away;
  const theirScore = isHome ? match.score?.away : match.score?.home;

  return (
    <li>
      <button onClick={() => onSelect(match.id)} className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-bg-elevated transition-colors">
        <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${OUTCOME_STYLE[match.outcome]}`}>
          {OUTCOME_LABEL[match.outcome]}
        </span>
        <img src={teamLogo(opponent.id, 32)} alt="" className="w-4 h-4 shrink-0" loading="lazy" />
        <span className="flex-1 min-w-0 text-right text-[11px] text-text-primary truncate">{opponent.name}</span>
        {match.score && (
          <span className="score-font text-[11px] text-text-secondary tabular-nums shrink-0">
            {myScore}-{theirScore}
          </span>
        )}
      </button>
    </li>
  );
}
