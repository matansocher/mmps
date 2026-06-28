import { useLocation } from 'wouter';
import type { LineupPlayer } from '../types';
import { athletePhoto } from '../lib/logos';

type Props = {
  players: readonly LineupPlayer[];
  formation?: string;
};

export function FormationPitch({ players, formation }: Props) {
  const positioned = players.filter((p) => p.fieldLine != null && p.yardSide != null);
  if (positioned.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '3 / 4' }}>
      <Pitch />
      {positioned.map((p) => (
        <PlayerToken key={p.memberId} player={p} />
      ))}
      {formation && (
        <div className="absolute bottom-2 right-2 score-font rounded-md bg-black/45 px-2 py-1 text-xs font-semibold text-white">
          {formation}
        </div>
      )}
    </div>
  );
}

function Pitch() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#2E7D32] to-[#1B5E20]">
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 10%, transparent 10% 20%)' }} />
      <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" style={{ aspectRatio: '1 / 1', height: 'auto', width: '34%' }} />
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[16%] w-[44%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute left-1/2 top-0 h-[16%] w-[44%] -translate-x-1/2 border-x border-b border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[7%] w-[22%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute left-1/2 top-0 h-[7%] w-[22%] -translate-x-1/2 border-x border-b border-white/25" />
    </div>
  );
}

function PlayerToken({ player }: { player: LineupPlayer }) {
  const [, navigate] = useLocation();
  const left = `${11 + (player.yardSide ?? 50) * 0.78}%`;
  const top = `${8 + (100 - (player.fieldLine ?? 0)) * 0.84}%`;
  const clickable = player.athleteId > 0;

  return (
    <button
      onClick={() => clickable && navigate(`/athlete/${player.athleteId}`)}
      className="absolute flex w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      style={{ left, top }}
    >
      <div className="relative">
        {player.athleteId > 0 ? (
          <img src={athletePhoto(player.athleteId)} alt="" loading="lazy" className="h-10 w-10 rounded-full border-2 border-white/80 bg-bg-elevated object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-bg-elevated">
            <span className="score-font text-sm font-bold text-white">{player.jerseyNumber ?? ''}</span>
          </div>
        )}
        {player.athleteId > 0 && player.jerseyNumber != null && (
          <span className="score-font absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-bg-base">
            {player.jerseyNumber}
          </span>
        )}
        {player.ranking != null && (
          <span className={`score-font absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 text-[10px] font-bold text-white ${ratingClass(player.ranking)}`}>
            {player.ranking.toFixed(1)}
          </span>
        )}
      </div>
      <span className="mt-1 max-w-full truncate rounded bg-black/40 px-1 text-[10px] font-medium leading-tight text-white">
        {player.shortName || player.name}
      </span>
    </button>
  );
}

function ratingClass(rating: number): string {
  if (rating >= 7) return 'bg-[#16A34A]';
  if (rating >= 6) return 'bg-[#D97706]';
  return 'bg-[#DC2626]';
}
