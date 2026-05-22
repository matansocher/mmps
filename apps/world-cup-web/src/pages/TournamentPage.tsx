import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { getTeamImageUrl } from '../data/player-images';
import { BottomNav } from '../components/BottomNav';
import type { GroupStandings } from '../lib/types';

function groupNumToLetter(num: number): string {
  return String.fromCharCode(64 + num); // 1=A, 2=B, ...
}

export function TournamentPage() {
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    api.standings().then((res) => {
      setStandings(res.standings);
      setLoading(false);
    }).catch(() => setLoading(false));
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
