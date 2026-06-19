import type { Placement } from '../lib/game';
import { FORMATION, type Slot } from '../lib/positions';

type Props = {
  placements: readonly Placement[];
  highlightSlotIds?: ReadonlySet<string>;
  movingSlotId?: string | null;
  onSlotClick?: (slot: Slot) => void;
  onPlacedClick?: (placement: Placement) => void;
};

export function Pitch({ placements, highlightSlotIds, movingSlotId, onSlotClick, onPlacedClick }: Props) {
  const placedBySlot = new Map(placements.map((p) => [p.slotId, p]));

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '3 / 4' }}>
      <PitchMarkings />
      {FORMATION.map((slot) => {
        const placement = placedBySlot.get(slot.id);
        const highlighted = highlightSlotIds?.has(slot.id) ?? false;
        const left = `${11 + slot.side * 0.78}%`;
        const top = `${8 + (100 - slot.line) * 0.84}%`;
        const placedClickable = !!placement && !!onPlacedClick;
        const openClickable = !placement && highlighted && !!onSlotClick;
        return (
          <button
            key={slot.id}
            disabled={!placedClickable && !openClickable}
            onClick={() => {
              if (placement && onPlacedClick) onPlacedClick(placement);
              else if (onSlotClick) onSlotClick(slot);
            }}
            className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left, top }}
          >
            {placement ? (
              <PlacedToken placement={placement} moving={movingSlotId === slot.id} />
            ) : (
              <EmptySlot type={slot.type} highlighted={highlighted} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function PitchMarkings() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#2E7D32] to-[#1B5E20]">
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 10%, transparent 10% 20%)' }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" style={{ width: '34%', aspectRatio: '1 / 1' }} />
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[16%] w-[44%] -translate-x-1/2 border-x border-t border-white/25" />
      <div className="absolute left-1/2 top-0 h-[16%] w-[44%] -translate-x-1/2 border-x border-b border-white/25" />
    </div>
  );
}

function EmptySlot({ type, highlighted }: { type: string; highlighted: boolean }) {
  return (
    <>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed ${
          highlighted ? 'border-accent-draw bg-accent-draw/20 animate-slot-pulse' : 'border-white/40 bg-black/15'
        }`}
      >
        <span className="score-font text-[10px] text-white/80">{type}</span>
      </div>
      <span className="rounded bg-black/40 px-1 text-[10px] font-medium text-white/70">{type}</span>
    </>
  );
}

function PlacedToken({ placement, moving }: { placement: Placement; moving: boolean }) {
  const { player, viaPrimary } = placement;
  const ringClass = moving ? 'border-accent-draw' : 'border-white/80';
  return (
    <>
      <div className="relative">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt="" loading="lazy" className={`h-10 w-10 rounded-full border-2 bg-bg-elevated object-cover ${ringClass}`} />
        ) : (
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-bg-elevated ${ringClass}`}>
            <span className="score-font text-xs font-bold text-white">{player.name.slice(0, 2)}</span>
          </div>
        )}
        {player.clubLogoUrl && (
          <img src={player.clubLogoUrl} alt="" loading="lazy" className="absolute -left-1.5 -top-1.5 h-4 w-4 rounded-sm bg-white/90 object-contain p-px" />
        )}
        {player.flagUrl && (
          <img src={player.flagUrl} alt="" loading="lazy" className="absolute -right-1.5 -top-1.5 h-3 w-4 rounded-sm object-cover" />
        )}
        <span className={`score-font absolute -bottom-1 left-1/2 -translate-x-1/2 rounded px-1 text-[10px] font-bold text-white ${ratingClass(player.overall)}`}>
          {player.overall}
        </span>
        {!viaPrimary && (
          <span className="absolute -bottom-1 -right-1 rounded-full bg-accent-loss px-1 text-[8px] font-bold text-white" title="Out of position">
            !
          </span>
        )}
      </div>
      <span className="mt-1 max-w-full truncate rounded bg-black/40 px-1 text-[10px] font-medium leading-tight text-white">
        {player.name}
      </span>
    </>
  );
}

function ratingClass(rating: number): string {
  if (rating >= 85) return 'bg-[#16A34A]';
  if (rating >= 78) return 'bg-[#D97706]';
  return 'bg-[#DC2626]';
}
