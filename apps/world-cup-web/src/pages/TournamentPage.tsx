import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { getTeamImageUrl } from '../data/player-images';
import { BottomNav } from '../components/BottomNav';
import type { GroupStandings, MatchDto } from '../lib/types';

function groupNumToLetter(num: number): string {
  return String.fromCharCode(64 + num); // 1=A, 2=B, ...
}

const KNOCKOUT_STAGES = ['סיבוב 32', 'שמינית גמר', 'רבע גמר', 'חצי גמר', 'גמר'];

export function TournamentPage() {
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    Promise.all([
      api.standings().then((res) => setStandings(res.standings)),
      api.matches().then((res) => {
        const knockout = res.matches.filter((m) => KNOCKOUT_STAGES.some((s) => m.stage.includes(s)));
        setKnockoutMatches(knockout);
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-base">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted">טוען טבלאות...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-bold text-text-primary text-center">שלב הבתים</h1>
        </div>

        <div className="px-3 space-y-4 pb-6">
          {standings.map((group) => (
            <GroupTable key={group.num} group={group} onTeamClick={(id) => navigate(`/teams/${id}`)} />
          ))}
        </div>

        {/* Knockout Bracket */}
        {knockoutMatches.length > 0 && (
          <div className="px-3 pb-6">
            <h2 className="text-lg font-bold text-text-primary text-center mb-4">שלב הנוקאאוט</h2>
            <BracketView matches={knockoutMatches} onMatchClick={(id) => navigate(`/match/${id}`)} />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function GroupTable({ group, onTeamClick }: { group: GroupStandings; onTeamClick: (id: number) => void }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle">
        <h2 className="text-sm font-bold text-text-primary">בית {groupNumToLetter(group.num)}</h2>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-muted border-b border-border-subtle">
            <th className="py-1.5 pr-3 text-right w-[40%]">קבוצה</th>
            <th className="py-1.5 px-1 text-center">מ</th>
            <th className="py-1.5 px-1 text-center">נ</th>
            <th className="py-1.5 px-1 text-center">ת</th>
            <th className="py-1.5 px-1 text-center">ה</th>
            <th className="py-1.5 px-1 text-center">הפ</th>
            <th className="py-1.5 px-1 text-center font-bold">נק</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => (
            <GroupRow key={row.competitorId} row={row} onTeamClick={onTeamClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRow({ row, onTeamClick }: { row: GroupStandings['rows'][number]; onTeamClick: (id: number) => void }) {
  const qualifies = row.position <= 2;

  return (
    <tr
      className={`border-b border-border-subtle last:border-b-0 cursor-pointer hover:bg-bg-elevated/50 transition-colors ${qualifies ? 'bg-accent-exact/5' : ''}`}
      onClick={() => onTeamClick(row.competitorId)}
    >
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted w-3 text-center">{row.position}</span>
          <img src={getTeamImageUrl(row.competitorId, 20)} alt="" className="w-5 h-5 rounded-full" />
          <span className="text-text-primary font-medium truncate">{row.name}</span>
        </div>
      </td>
      <td className="py-2 px-1 text-center text-text-muted">{row.gamePlayed}</td>
      <td className="py-2 px-1 text-center text-text-muted">{row.gamesWon}</td>
      <td className="py-2 px-1 text-center text-text-muted">{row.gamesEven}</td>
      <td className="py-2 px-1 text-center text-text-muted">{row.gamesLost}</td>
      <td className="py-2 px-1 text-center text-text-muted">{row.goalDiff >= 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
      <td className="py-2 px-1 text-center text-text-primary font-bold">{row.points}</td>
    </tr>
  );
}

// Knockout Bracket
function BracketView({ matches, onMatchClick }: { matches: MatchDto[]; onMatchClick: (id: number) => void }) {
  const stages = groupMatchesByStage(matches);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max px-2">
        {stages.map((stage) => (
          <div key={stage.name} className="flex flex-col gap-3 min-w-[160px]">
            <h3 className="text-xs text-text-secondary font-semibold text-center">{stage.name}</h3>
            {stage.matches.map((m) => (
              <BracketMatchCard key={m.id} match={m} onClick={() => onMatchClick(m.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupMatchesByStage(matches: MatchDto[]): { name: string; matches: MatchDto[] }[] {
  const order = KNOCKOUT_STAGES;
  const groups: { name: string; matches: MatchDto[] }[] = [];
  for (const stageName of order) {
    const stageMatches = matches.filter((m) => m.stage.includes(stageName));
    if (stageMatches.length > 0) {
      groups.push({ name: stageName, matches: stageMatches });
    }
  }
  return groups;
}

function BracketMatchCard({ match, onClick }: { match: MatchDto; onClick: () => void }) {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  return (
    <div
      onClick={onClick}
      className="bg-bg-card border border-border-subtle rounded-lg p-2 cursor-pointer hover:border-accent-exact/40 transition-colors"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span>{match.home.flag}</span>
          <span className="truncate text-text-primary">{match.home.name}</span>
        </div>
        {(isFinished || isLive) && <span className="score-font text-sm font-bold">{match.home.score}</span>}
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span>{match.away.flag}</span>
          <span className="truncate text-text-primary">{match.away.name}</span>
        </div>
        {(isFinished || isLive) && <span className="score-font text-sm font-bold">{match.away.score}</span>}
      </div>
      {isLive && <div className="text-accent-live text-[10px] font-bold text-center mt-1 animate-pulse">LIVE</div>}
    </div>
  );
}
