import { useT } from '../lib/i18n';
import type { Game, GameHeadline, GameHeadlineType } from '../types';
import { Icon, type IconName } from './Icon';

type Tone = 'gold' | 'up' | 'down';

const TONE: Readonly<Record<GameHeadlineType, Tone>> = {
  champions: 'gold',
  qualified: 'up',
  top: 'gold',
  zoneIn: 'up',
  dangerOut: 'up',
  moveUp: 'up',
  relegated: 'down',
  lostTop: 'down',
  zoneOut: 'down',
  dangerIn: 'down',
};

const TONE_STYLE: Readonly<Record<Tone, { readonly icon: IconName; readonly color: string; readonly chip: string }>> = {
  gold: { icon: 'trophy', color: 'text-accent-fav', chip: 'bg-accent-fav/12' },
  up: { icon: 'trendUp', color: 'text-accent-live', chip: 'bg-accent-live/12' },
  down: { icon: 'trendDown', color: 'text-accent-red', chip: 'bg-accent-red/12' },
};

function useHeadlineText(game: Game, headline: GameHeadline): string {
  const t = useT().card.headlines;
  const team = headline.teamId === game.away.id ? game.away : game.home;
  const name = team.shortName || team.name;
  switch (headline.type) {
    case 'zoneIn':
    case 'zoneOut':
    case 'dangerIn':
    case 'dangerOut':
      return t[headline.type](name, headline.zone ?? '');
    case 'moveUp':
      return t.moveUp(name, headline.position ?? 0);
    default:
      return t[headline.type](name);
  }
}

// One line on what a finished game changed: title, table position, zones or a knockout tie.
export function GameHeadlineLine({ game, headline, compact }: { readonly game: Game; readonly headline: GameHeadline; readonly compact?: boolean }) {
  const text = useHeadlineText(game, headline);
  const style = TONE_STYLE[TONE[headline.type]];
  if (compact) {
    return (
      <p className="flex min-w-0 items-center justify-center gap-1.5 text-caption text-text-secondary">
        <Icon name={style.icon} size={12} className={`shrink-0 ${style.color}`} />
        <span className="truncate">{text}</span>
      </p>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2.5 border-t border-line pt-3">
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${style.chip} ${style.color}`}>
        <Icon name={style.icon} size={13} />
      </span>
      <span className="truncate text-xs font-medium text-text-primary/90">{text}</span>
    </div>
  );
}
