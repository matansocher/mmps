import { useEffect, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useT } from '../lib/i18n';
import type { GameNotification } from '../lib/notifications';
import type { EventType } from '../types';
import { navigate } from '../lib/router';
import { hapticSelect } from '../lib/telegram';
import { TeamLogo } from './TeamLogo';
import { CompetitionLogo } from './CompetitionLogo';
import { Icon } from './Icon';
import { ScoreLine } from './ui';

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
      <CompetitionLogo competitionId={notification.competitionId} size={12} />
      <span className="text-text-muted">·</span>
      <TeamLogo teamId={home.id} name={home.name} size={14} />
      <span className="truncate">{home.shortName || home.name}</span>
      <span className="score-font shrink-0 text-text-primary">
        <ScoreLine home={home.score ?? 0} away={away.score ?? 0} />
      </span>
      <span className="truncate">{away.shortName || away.name}</span>
      <TeamLogo teamId={away.id} name={away.name} size={14} />
    </div>
  );
}

// Card icons carry their own fill, so only goals get a tinted badge.
const BADGE_TONE: Partial<Record<EventType, string>> = { goal: 'bg-accent-live text-bg-base' };

// Team events show the team's logo with a small event badge; game-level ones (kick-off, full-time) keep the plain icon.
function NotificationIcon({ notification }: { readonly notification: GameNotification }) {
  const team = notification.side ? notification.game[notification.side] : undefined;
  if (!team) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-primary">
        <Icon name={notification.icon} size={16} />
      </span>
    );
  }
  const tone = (notification.eventType && BADGE_TONE[notification.eventType]) ?? 'bg-bg-base text-text-primary';
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
      <TeamLogo teamId={team.id} name={team.name} size={24} />
      <span className={`absolute -bottom-1 -end-1 flex size-4 items-center justify-center rounded-full ring-2 ring-bg-elevated ${tone}`}>
        <Icon name={notification.icon} size={10} />
      </span>
    </span>
  );
}

// Drains from the fetch that brought the notification until the next poll replaces it.
function CountdownBar({ from, to }: { readonly from: number; readonly to: number }) {
  const duration = to - from;
  if (duration <= 0) return null;
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-line/40" aria-hidden>
      <span
        className="notification-countdown block h-full origin-left bg-accent-live/80 rtl:origin-right"
        style={{ animationDuration: `${duration}ms`, animationDelay: `${from - Date.now()}ms` }}
      />
    </span>
  );
}

type Countdown = { readonly from: number; readonly to: number } | null;

function NotificationCard({ notification, countdown, onDismiss }: { readonly notification: GameNotification; readonly countdown: Countdown; readonly onDismiss: () => void }) {
  const open = () => {
    hapticSelect();
    navigate({ name: 'game', id: notification.gameId });
  };
  return (
    <div className="notification-in pointer-events-auto relative flex overflow-hidden rounded-2xl border border-line bg-bg-elevated/95 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] backdrop-blur-md">
      <button onClick={open} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-start">
        <NotificationIcon notification={notification} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="shrink-0 font-bold">{notification.title}</span>
            {notification.minuteDisplay && <span className="score-font ltr-num shrink-0 text-xs text-accent-live">{notification.minuteDisplay}</span>}
            {notification.text && <span className="truncate text-text-secondary">{notification.text}</span>}
          </span>
          <Score notification={notification} />
        </span>
      </button>
      <button onClick={onDismiss} aria-label={useT().common.dismiss} className="tap relative shrink-0 px-2.5 text-text-muted hover:text-text-primary">
        <Icon name="close" size={14} />
      </button>
      {countdown && <CountdownBar key={countdown.to} from={countdown.from} to={countdown.to} />}
    </div>
  );
}

export function Notifications() {
  const { notifications, dismissNotification, clearNotifications, lastFetchedAt, nextRetryAt } = useDashboard();
  const [expanded, setExpanded] = useState(false);
  const isDesktop = useIsDesktop();
  const t = useT();

  useEffect(() => setExpanded(false), [notifications]);

  if (!notifications.length) return null;
  // Newest first: later events in a poll are the most recent.
  const ordered = [...notifications].reverse();
  const limit = expanded ? ordered.length : isDesktop ? MAX_VISIBLE_DESKTOP : MAX_VISIBLE_MOBILE;
  const visible = ordered.slice(0, limit);
  const hidden = ordered.length - visible.length;
  const countdown: Countdown = lastFetchedAt && nextRetryAt && nextRetryAt > lastFetchedAt ? { from: lastFetchedAt, to: nextRetryAt } : null;

  return (
    <div
      className="pointer-events-none fixed inset-x-2 top-2 z-50 flex max-h-[calc(100vh-1rem)] flex-col gap-2 overflow-y-auto md:inset-x-auto md:end-4 md:top-[72px] md:w-[380px]"
      role="status"
      aria-live="polite"
    >
      {visible.map((n) => (
        <NotificationCard key={n.key} notification={n} countdown={countdown} onDismiss={() => dismissNotification(n.key)} />
      ))}
      <div className="pointer-events-auto flex justify-end gap-2">
        {hidden > 0 && (
          <button onClick={() => setExpanded(true)} className="rounded-full bg-bg-elevated/95 px-3 py-1 text-xs font-semibold text-text-secondary shadow-lg backdrop-blur-md hover:text-text-primary">
            {t.notifications.more(hidden)}
          </button>
        )}
        {ordered.length > 1 && (
          <button onClick={clearNotifications} className="rounded-full bg-bg-elevated/95 px-3 py-1 text-xs font-semibold text-text-secondary shadow-lg backdrop-blur-md hover:text-text-primary">
            {t.notifications.clearAll}
          </button>
        )}
      </div>
    </div>
  );
}
