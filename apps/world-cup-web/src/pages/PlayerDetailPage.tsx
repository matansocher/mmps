import { useMemo, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { TEAMS_DATA } from '../data/teams';
import { SQUADS_DATA } from '../data/squads';
import { getPlayerImageUrl, getTeamImageUrl } from '../data/player-images';
import { showBackButton } from '../lib/telegram';
import { BottomNav } from '../components/BottomNav';

const POSITION_LABELS: Record<string, string> = {
  GK: 'שוער',
  DF: 'מגן',
  MF: 'קשר',
  FW: 'חלוץ',
};

export function PlayerDetailPage() {
  const { teamId, playerIndex } = useParams<{ teamId: string; playerIndex: string }>();
  const [, navigate] = useLocation();

  const team = useMemo(() => TEAMS_DATA.find((t) => t.id === Number(teamId)), [teamId]);
  const player = useMemo(() => {
    if (!team) return null;
    const squad = SQUADS_DATA[team.id] ?? [];
    return squad[Number(playerIndex)] ?? null;
  }, [team, playerIndex]);

  useEffect(() => {
    return showBackButton(() => navigate(`/teams/${teamId}`));
  }, [teamId, navigate]);

  if (!team || !player) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-base">
        <div className="p-6 text-text-muted text-center">שחקן לא נמצא</div>
        <BottomNav />
      </div>
    );
  }

  const imageUrl = getPlayerImageUrl(player.name, 120);
  const clubImageUrl = player.clubId ? getTeamImageUrl(player.clubId, 40) : null;

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <div className="flex-1 overflow-y-auto pb-16">
        {/* Header with player image */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="relative mb-4">
            {imageUrl ? (
              <img src={imageUrl} alt={player.name} className="w-28 h-28 rounded-full object-cover bg-bg-elevated border-2 border-border-subtle" />
            ) : (
              <div className="w-28 h-28 rounded-full bg-bg-elevated flex items-center justify-center text-4xl border-2 border-border-subtle">👤</div>
            )}
            {clubImageUrl && (
              <img src={clubImageUrl} alt="club" className="absolute -bottom-1 -left-1 w-10 h-10 rounded-full bg-bg-card border border-border-subtle" />
            )}
          </div>
          <h1 className="text-xl font-bold text-text-primary">{player.name}</h1>
        </div>

        {/* Info cards */}
        <div className="px-4 space-y-3 pb-6">
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 space-y-3">
            <InfoRow label="עמדה" value={POSITION_LABELS[player.position] ?? player.position} />
            <InfoRow label="נבחרת" value={`${team.flag} ${team.name}`} />
            {player.age > 0 && <InfoRow label="גיל" value={String(player.age)} />}
          </div>

          {/* Back to team button */}
          <button
            onClick={() => navigate(`/teams/${team.id}`)}
            className="w-full bg-bg-card rounded-xl border border-border-subtle p-4 flex items-center gap-3 hover:border-accent-exact transition-colors"
          >
            <img src={getTeamImageUrl(team.id, 40)} alt={team.name} className="w-10 h-10 rounded-full bg-bg-elevated" />
            <div className="text-right">
              <div className="text-sm font-medium text-text-primary">{team.flag} {team.name}</div>
              <div className="text-xs text-text-muted">דירוג FIFA: #{team.fifaRanking} · בית {team.group}</div>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm text-text-primary font-medium">{value}</span>
    </div>
  );
}
