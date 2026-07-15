import type { League } from '../types';
import { shortName } from '../lib/teams';
import { TeamLogo } from './TeamLogo';

export type TeamCardState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

type Props = {
  readonly league: League;
  readonly team: string;
  readonly seed: string;
  readonly state?: TeamCardState;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
};

const RING: Record<TeamCardState, string> = {
  idle: 'ring-1 ring-line-strong',
  selected: 'ring-2 ring-hoop',
  correct: 'ring-2 ring-win',
  wrong: 'ring-2 ring-miss',
  dim: 'ring-1 ring-line-subtle opacity-45',
};

export function TeamCard({ league, team, seed, state = 'idle', onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`no-select flex w-full items-center gap-3 rounded-2xl bg-court-elevated px-3 py-3 text-left transition active:scale-[0.98] ${RING[state]}`}
    >
      <TeamLogo league={league} team={team} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">{shortName(league, team)}</span>
        {seed && <span className="block text-xs text-ink-muted">{team}</span>}
      </span>
      {seed && <span className="shrink-0 rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">{seed}</span>}
      {state === 'correct' && <span className="text-win">✓</span>}
      {state === 'wrong' && <span className="text-miss">✗</span>}
    </button>
  );
}
