import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { getTeamImageUrl } from '../data/player-images';
import { BottomNav } from '../components/BottomNav';
import type { GroupStandings, MatchDto, TournamentStats, PlayerStat } from '../lib/types';

function groupNumToLetter(num: number): string {
  return String.fromCharCode(64 + num); // 1=A, 2=B, ...
}

const KNOCKOUT_STAGES = ['סיבוב 32', 'שמינית גמר', 'רבע גמר', 'חצי גמר', 'גמר'];

type SubTab = 'groups' | 'stats';

export function TournamentPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('groups');

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <div className="flex-1 overflow-y-auto pb-16">
        {/* Sub-tabs */}
        <div className="sticky top-0 z-10 bg-bg-base border-b border-border-subtle">
          <div className="flex">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${activeTab === 'groups' ? 'text-accent-exact border-b-2 border-accent-exact' : 'text-text-muted'}`}
            >
              בתים
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${activeTab === 'stats' ? 'text-accent-exact border-b-2 border-accent-exact' : 'text-text-muted'}`}
            >
              סטטיסטיקה
            </button>
          </div>
        </div>

        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'stats' && <StatsTab />}
      </div>
      <BottomNav />
    </div>
  );
}

// ──────────────────────────────────────────────
// Groups Tab (existing content)
// ──────────────────────────────────────────────

function GroupsTab() {
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
    return <div className="flex items-center justify-center py-12"><div className="text-text-muted">טוען טבלאות...</div></div>;
  }

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-text-primary text-center">שלב הבתים</h1>
      </div>

      <div className="px-3 space-y-4 pb-6">
        {standings.map((group) => (
          <GroupTable key={group.num} group={group} onTeamClick={(id) => navigate(`/teams/${id}`)} />
        ))}
      </div>

      {knockoutMatches.length > 0 && (
        <div className="px-3 pb-6">
          <h2 className="text-lg font-bold text-text-primary text-center mb-4">שלב הנוקאאוט</h2>
          <BracketView matches={knockoutMatches} onMatchClick={(id) => navigate(`/match/${id}`)} />
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// Stats Tab (new)
// ──────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="text-text-muted">טוען סטטיסטיקה...</div></div>;
  }

  if (!stats || (stats.topScorers.length === 0 && stats.topAssisters.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-muted text-center">
          <p className="text-2xl mb-2">📊</p>
          <p>הסטטיסטיקה תתעדכן לאחר תחילת המשחקים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 pb-6 space-y-4">
      {stats.topScorers.length > 0 && <StatSection title="מלך השערים ⚽" items={stats.topScorers} />}
      {stats.topAssisters.length > 0 && <StatSection title="מלך הבישולים 🎯" items={stats.topAssisters} />}
      {stats.topYellowCards.length > 0 && <StatSection title="כרטיסים צהובים 🟨" items={stats.topYellowCards} />}
      {stats.topRedCards.length > 0 && <StatSection title="כרטיסים אדומים 🟥" items={stats.topRedCards} />}
    </div>
  );
}

function StatSection({ title, items }: { title: string; items: PlayerStat[] }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border-subtle overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle">
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
      </div>
      <div className="divide-y divide-border-subtle">
        {items.map((item, idx) => (
          <div key={`${item.playerName}-${item.teamName}`} className="flex items-center px-3 py-2.5 gap-3">
            <span className="text-xs text-text-muted w-5 text-center font-medium">{idx + 1}</span>
            <span className="text-base">{item.teamFlag}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary font-medium truncate">{item.playerName}</div>
              <div className="text-xs text-text-muted truncate">{item.teamName}</div>
            </div>
            <span className="text-sm font-bold text-accent-exact min-w-[24px] text-center">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Groups sub-components
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Knockout Bracket
// ──────────────────────────────────────────────

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
