import type { FormationDef, SquadPlayer } from '../types';
import { LineupEditor } from './LineupEditor';

type Opponent = {
  readonly name: string;
  readonly logoUrl: string;
  readonly isHome: boolean;
  readonly matchday: number;
};

type Props = {
  readonly formations: readonly FormationDef[];
  readonly initialFormationId: string;
  readonly players: readonly SquadPlayer[];
  readonly initialStarters: readonly number[]; // ordered, slot i = starters[i]
  readonly busy: boolean;
  readonly opponent: Opponent | null;
  readonly teamName: string | null;
  readonly teamLogoUrl: string | null;
  readonly onKickOff: (starters: number[], formationId: string) => void;
};

export function PreMatch({ formations, initialFormationId, players, initialStarters, busy, opponent, teamName, teamLogoUrl, onKickOff }: Props) {
  const header =
    opponent && teamName && teamLogoUrl ? (
      <div className="fm-preview fm-preview-prematch">
        <div className="fm-preview-head">
          <span className="fm-preview-md">Matchday {opponent.matchday}</span>
          <span className={`fm-preview-venue ${opponent.isHome ? 'home' : 'away'}`}>{opponent.isHome ? 'Home' : 'Away'}</span>
        </div>
        <div className="fm-preview-teams">
          <div className="fm-preview-team">
            <img src={teamLogoUrl} alt="" loading="lazy" />
            <span>{teamName}</span>
          </div>
          <span className="fm-preview-vs">vs</span>
          <div className="fm-preview-team">
            <img src={opponent.logoUrl} alt="" loading="lazy" />
            <span>{opponent.name}</span>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <LineupEditor
      formations={formations}
      initialFormationId={initialFormationId}
      players={players}
      initialStarters={initialStarters}
      busy={busy}
      header={header}
      intro="Confirm your XI. Drag any player onto another to swap them — pitch to pitch, or bench onto the pitch. Off-position players are dimmed."
      actionLabel="▶ Kick off"
      busyLabel="Kicking off…"
      onCommit={onKickOff}
    />
  );
}
