import { useMemo, useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { TEAMS_DATA } from '../data/teams';
import { SQUADS_DATA } from '../data/squads';
import { getPlayerImageUrl } from '../data/player-images';
import { api } from '../lib/api';
import type { MatchDto, PlayerDto } from '../lib/types';
import { BottomNav } from '../components/BottomNav';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [matches, setMatches] = useState<MatchDto[]>([]);

  const team = useMemo(() => TEAMS_DATA.find((t) => t.id === Number(id)), [id]);
  const squad: PlayerDto[] = useMemo(() => (team ? SQUADS_DATA[team.id] ?? [] : []), [team]);

  useEffect(() => {
    api.matches().then((res) => setMatches(res.matches));
  }, []);

  const teamMatches = useMemo(() => {
    if (!team) return [];
    return matches
      .filter((m) => m.home.name === team.name || m.away.name === team.name)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [matches, team]);

  if (!team) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-base">
        <div className="flex-1 p-6 text-text-muted text-center">קבוצה לא נמצאה</div>
        <BottomNav />
      </div>
    );
  }

  const goalkeepers = squad.map((p, idx) => ({ ...p, _idx: idx })).filter((p) => p.position === 'GK');
  const defenders = squad.map((p, idx) => ({ ...p, _idx: idx })).filter((p) => p.position === 'DF');
  const midfielders = squad.map((p, idx) => ({ ...p, _idx: idx })).filter((p) => p.position === 'MF');
  const forwards = squad.map((p, idx) => ({ ...p, _idx: idx })).filter((p) => p.position === 'FW');

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <div className="flex-1 overflow-y-auto pb-16">
        {/* Header */}
        <div className="p-4 space-y-4">
          <button onClick={() => navigate('/tournament')} className="text-accent-exact text-sm font-medium">
            → חזרה לטורניר
          </button>

          <div className="bg-bg-card rounded-xl p-5 border border-border-subtle text-center space-y-2">
            <span className="text-5xl block">{team.flag}</span>
            <h1 className="text-xl font-bold text-text-primary">{team.name}</h1>
            <div className="flex justify-center gap-4 text-sm text-text-secondary">
              <span>דירוג פיפא: #{team.fifaRanking}</span>
              <span>בית {team.group}</span>
            </div>
            <p className="text-sm text-text-muted">מאמן: {team.coach}</p>
          </div>

          {/* Group matches */}
          {teamMatches.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-text-primary">📅 משחקי הבית</h2>
              {teamMatches.map((m) => (
                <div key={m.id} className="bg-bg-card rounded-lg p-3 border border-border-subtle">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span>{m.home.flag}</span>
                      <span className="text-text-primary font-medium">{m.home.name}</span>
                    </div>
                    <div className="text-text-muted text-xs">
                      {m.status === 'finished' ? (
                        <span className="font-bold text-text-primary">
                          {m.home.score} - {m.away.score}
                        </span>
                      ) : (
                        formatMatchTime(m.startTime)
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-text-primary font-medium">{m.away.name}</span>
                      <span>{m.away.flag}</span>
                    </div>
                  </div>
                  {m.stage && <p className="text-[11px] text-text-muted mt-1 text-center">{m.stage}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Squad */}
          {squad.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-text-primary">👥 סגל המונדיאל ({squad.length} שחקנים)</h2>
              {goalkeepers.length > 0 && <PositionGroup label="שוערים" players={goalkeepers} teamId={team.id} />}
              {defenders.length > 0 && <PositionGroup label="מגנים" players={defenders} teamId={team.id} />}
              {midfielders.length > 0 && <PositionGroup label="קשרים" players={midfielders} teamId={team.id} />}
              {forwards.length > 0 && <PositionGroup label="חלוצים" players={forwards} teamId={team.id} />}
            </div>
          ) : (
            <div className="bg-bg-card rounded-xl p-4 border border-border-subtle text-center">
              <p className="text-sm text-text-muted">📋 הסגל טרם פורסם</p>
              <p className="text-xs text-text-muted mt-1">הסגל הסופי יפורסם עד 1 ביוני 2026</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function PositionGroup({ label, players, teamId }: { label: string; players: (PlayerDto & { _idx: number })[]; teamId: number }) {
  const [, navigate] = useLocation();
  return (
    <div>
      <h3 className="text-xs font-semibold text-accent-exact mb-1">{label}</h3>
      <div className="bg-bg-card rounded-lg border border-border-subtle divide-y divide-border-subtle">
        {players.map((player) => (
          <button
            key={player._idx}
            onClick={() => navigate(`/teams/${teamId}/player/${player._idx}`)}
            className="flex items-center justify-between px-3 py-2 w-full hover:bg-bg-elevated transition-colors"
          >
            <div className="flex items-center gap-2">
              <PlayerAvatar name={player.name} />
              <span className="text-sm text-text-primary">{player.name}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              {player.age > 0 && <span>גיל {player.age}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerAvatar({ name }: { name: string }) {
  const url = getPlayerImageUrl(name, 36);
  if (!url) return <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted text-xs">👤</div>;
  return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover bg-bg-elevated" />;
}

function formatMatchTime(startTime: string): string {
  const d = new Date(startTime);
  return d.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}
