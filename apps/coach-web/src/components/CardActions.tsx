import { createContext, type KeyboardEvent, type MouseEvent, useContext } from 'react';
import { useNow } from '../hooks/useNow';
import { hotReason } from '../lib/hot-game';
import { useT } from '../lib/i18n';
import type { Game } from '../types';
import { Icon } from './Icon';

export type CardActions = {
  readonly openPreMatch: (game: Game, trigger: HTMLElement) => void;
};

// Provided by the dashboard only; cards elsewhere (league pages) render without pre-match buttons.
export const CardActionsContext = createContext<CardActions | null>(null);

// The buttons sit inside a clickable card, so they must not trigger its navigation.
const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

function teams(game: Game): string {
  return `${game.home.shortName || game.home.name} - ${game.away.shortName || game.away.name}`;
}

const BUTTON = 'tap relative flex size-7 shrink-0 items-center justify-center rounded-full transition duration-150 ease-out hover:bg-surface-3 active:scale-90';

export function PreMatchButton({ game }: { readonly game: Game }) {
  const actions = useContext(CardActionsContext);
  const t = useT().dashboard.preMatch;
  if (!actions || (game.status !== 'scheduled' && game.status !== 'live')) return null;
  const label = t.open(teams(game));
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={label}
      title={label}
      onClick={(e) => {
        stop(e);
        actions.openPreMatch(game, e.currentTarget);
      }}
      onKeyDown={stop}
      className={`${BUTTON} text-text-muted hover:text-text-primary`}
    >
      <Icon name="info" size={16} />
    </button>
  );
}

export function useHotReason(game: Game) {
  const now = useNow(60_000);
  return hotReason(game, now);
}

export function HotBadge({ game, compact }: { readonly game: Game; readonly compact?: boolean }) {
  const t = useT().dashboard.hot;
  const reason = useHotReason(game);
  if (!reason) return null;
  const label = t.label(t.reasons[reason]);
  if (compact) {
    return (
      <span role="img" aria-label={label} title={label} className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent-hot/15 text-accent-hot-text">
        <Icon name="flame" size={11} />
      </span>
    );
  }
  return (
    <span title={label} className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-accent-hot/18 ps-2 pe-2.5 text-xs font-bold whitespace-nowrap text-accent-hot-text">
      <Icon name="flame" size={14} />
      <span className="sr-only">{label}</span>
      <span aria-hidden>{t.reasons[reason]}</span>
    </span>
  );
}
