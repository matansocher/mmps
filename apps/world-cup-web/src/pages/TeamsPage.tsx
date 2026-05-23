import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { TEAMS_DATA } from '../data/teams';
import { BottomNav } from '../components/BottomNav';

type SortMode = 'group' | 'ranking';

export function TeamsPage() {
  const [, navigate] = useLocation();
  const [sortMode, setSortMode] = useState<SortMode>('group');
  const [search, setSearch] = useState('');

  const filteredTeams = useMemo(() => {
    let teams = [...TEAMS_DATA];
    if (search) {
      teams = teams.filter((t) => t.name.includes(search));
    }
    if (sortMode === 'ranking') {
      teams.sort((a, b) => a.fifaRanking - b.fifaRanking);
    }
    return teams;
  }, [sortMode, search]);

  const grouped = useMemo(() => {
    if (sortMode !== 'group') return null;
    const map = new Map<string, typeof filteredTeams>();
    for (const team of filteredTeams) {
      const arr = map.get(team.group) ?? [];
      arr.push(team);
      map.set(team.group, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTeams, sortMode]);

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <div className="flex-1 overflow-y-auto pb-16">
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-bold text-text-primary text-center">🏆 קבוצות המונדיאל</h1>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 חיפוש קבוצה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted"
            dir="rtl"
          />

          {/* Sort toggle */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setSortMode('group')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sortMode === 'group' ? 'bg-accent-exact text-white' : 'bg-bg-card text-text-secondary border border-border-subtle'
              }`}
            >
              לפי בית
            </button>
            <button
              onClick={() => setSortMode('ranking')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sortMode === 'ranking' ? 'bg-accent-exact text-white' : 'bg-bg-card text-text-secondary border border-border-subtle'
              }`}
            >
              לפי דירוג פיפא
            </button>
          </div>

          {/* Teams list */}
          {sortMode === 'group' && grouped ? (
            <div className="space-y-4">
              {grouped.map(([group, teams]) => (
                <div key={group}>
                  <h2 className="text-sm font-bold text-accent-exact mb-2">בית {group}</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {teams.map((team) => (
                      <TeamCard key={team.id} team={team} onClick={() => navigate(`/teams/${team.id}`)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredTeams.map((team) => (
                <TeamCard key={team.id} team={team} onClick={() => navigate(`/teams/${team.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function TeamCard({ team, onClick }: { team: (typeof TEAMS_DATA)[number]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-bg-card rounded-xl p-[0.35rem] border border-border-subtle hover:border-accent-exact transition-colors text-right w-full"
    >
      <span className="text-2xl">{team.flag}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-text-primary truncate">{team.name}</span>
        <span className="text-[11px] text-text-muted">#{team.fifaRanking} FIFA • בית {team.group}</span>
      </div>
    </button>
  );
}
