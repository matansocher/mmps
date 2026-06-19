import type { Player, Step } from '../lib/game';
import type { Slot } from '../lib/positions';
import { eligibleOpenSlots } from '../lib/game';

type Props = {
  step: Step;
  openSlots: readonly Slot[];
  selectedPlayerId: number | null;
  onSelect: (player: Player) => void;
};

export function PlayerList({ step, openSlots, selectedPlayerId, onSelect }: Props) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="text-text-primary text-sm font-semibold">{step.club}</div>
        <div className="text-text-muted text-xs">Pick a player from this club</div>
      </div>
      <ul className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
        {step.players.map((p) => {
          const playable = eligibleOpenSlots(p, openSlots).length > 0;
          const selected = p.id === selectedPlayerId;
          return (
            <li key={p.id}>
              <button
                disabled={!playable}
                onClick={() => onSelect(p)}
                className={`flex w-full items-center gap-3 px-3 py-2 transition-colors ${
                  selected ? 'bg-accent-draw/15' : 'hover:bg-bg-elevated/40'
                } ${playable ? '' : 'opacity-40 cursor-not-allowed'}`}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" loading="lazy" className="h-9 w-9 rounded-full bg-bg-elevated shrink-0 object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-bg-elevated shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    {p.flagUrl && <img src={p.flagUrl} alt="" loading="lazy" className="h-3 w-4 rounded-sm object-cover shrink-0" />}
                    <span className="text-text-primary text-sm truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted text-xs">
                    {p.clubLogoUrl && <img src={p.clubLogoUrl} alt="" loading="lazy" className="h-3.5 w-3.5 object-contain shrink-0" />}
                    <span className="truncate">{[p.position, ...p.alternatePositions].join(' · ')}</span>
                  </div>
                </div>
                <span className={`score-font text-sm font-bold ${overallColor(p.overall)}`}>{p.overall}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function overallColor(overall: number): string {
  if (overall >= 85) return 'text-accent-win';
  if (overall >= 78) return 'text-accent-draw';
  return 'text-text-secondary';
}
