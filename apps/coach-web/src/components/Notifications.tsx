import { useEffect, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { leagueColor } from '../lib/league-themes';
import type { GameNotification } from '../lib/notifications';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import { TeamLogo } from './TeamLogo';

const MAX_VISIBLE_DESKTOP = 4;
const MAX_VISIBLE_MOBILE = 2;

function useIsDesktop(): boolean {
  const query = '(min-width: 768px)';
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return matches;
}

function Score({ notification }: { readonly notification: GameNotification }) {
  const { home, away } = notification.game;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-text-secondary">
      <TeamLogo teamId={home.id} name={home.name} size={14} />
      <span className="truncate">{home.shortName || home.name}</span>
      <span className="score-font shrink-0 text-text-primary">
        {home.score ?? 0} - {away.score ?? 0}
      </span>
      <span className="truncate">{away.shortName || away.name}</span>
      <TeamLogo teamId={away.id} name={away.name} size={14} />
    </div>
  );
}

function NotificationCard({ notification, onDismiss }: { readonly notification: GameNotification; readonly onDismiss: () => void }) {
  const open = () => {
    hapticSelect();
    navigate({ name: 'game', id: notification.gameId });
  };
  return (
    <div className="notification-in pointer-events-auto relative flex overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated/95 shadow-2xl shadow-black/50 backdrop-blur-md">
      <span className="w-1 shrink-0" style={{ backgroundColor: leagueColor(notification.competitionId) }} aria-hidden />
      <button onClick={open} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-start">
        <span className="text-xl leading-none">{notification.icon}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="shrink-0 font-bold">{notification.title}</span>
            {notification.minuteDisplay && <span className="score-font shrink-0 text-xs text-accent-live">{notification.minuteDisplay}</span>}
            {notification.text && <span className="truncate text-text-secondary">{notification.text}</span>}
          </span>
          <Score notification={notification} />
        </span>
      </button>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 px-2.5 text-text-muted hover:text-text-primary">
        ✕
      </button>
    </div>
  );
}

export function Notifications() {
  const { notifications, dismissNotification, clearNotifications } = useDashboard();
  const [expanded, setExpanded] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => setExpanded(false), [notifications]);

  if (!notifications.length) return null;
  // Newest first: later events in a poll are the most recent.
  const ordered = [...notifications].reverse();
  const limit = expanded ? ordered.length : isDesktop ? MAX_VISIBLE_DESKTOP : MAX_VISIBLE_MOBILE;
  const visible = ordered.slice(0, limit);
  const hidden = ordered.length - visible.length;

  return (
    <div
      className="pointer-events-none fixed inset-x-2 top-2 z-50 flex max-h-[calc(100vh-1rem)] flex-col gap-2 overflow-y-auto md:inset-x-auto md:end-4 md:top-[72px] md:w-[380px]"
      role="status"
      aria-live="polite"
    >
      {visible.map((n) => (
        <NotificationCard key={n.key} notification={n} onDismiss={() => dismissNotification(n.key)} />
      ))}
      <div className="pointer-events-auto flex justify-end gap-2">
        {hidden > 0 && (
          <button onClick={() => setExpanded(true)} className="rounded-full bg-bg-elevated/95 px-3 py-1 text-xs font-semibold text-text-secondary shadow-lg backdrop-blur-md hover:text-text-primary">
            +{hidden} more
          </button>
        )}
        {ordered.length > 1 && (
          <button onClick={clearNotifications} className="rounded-full bg-bg-elevated/95 px-3 py-1 text-xs font-semibold text-text-muted shadow-lg backdrop-blur-md hover:text-text-primary">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
