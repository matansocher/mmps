import type { IconName } from '../components/Icon';
import type { EventType, GameEvent } from '../types';
import { daysBetween } from './dates';
import { getLocale, messages } from './i18n';

export const EVENT_META: Record<EventType, { readonly icon: IconName }> = {
  goal: { icon: 'ball' },
  redCard: { icon: 'redCard' },
  yellowCard: { icon: 'yellowCard' },
  missedPenalty: { icon: 'missedPenalty' },
  var: { icon: 'var' },
  woodwork: { icon: 'woodwork' },
  substitution: { icon: 'substitution' },
};

// Shown on game cards and list rows regardless of the notification settings.
export const CARD_EVENT_TYPES: ReadonlySet<EventType> = new Set(['goal', 'redCard', 'missedPenalty', 'var']);

export const EVENT_TYPE_ORDER: readonly EventType[] = ['goal', 'redCard', 'missedPenalty', 'var', 'yellowCard', 'woodwork', 'substitution'];

const ROUTINE_DETAILS = new Set(['field goal', 'goal']);

export function eventDetail(event: GameEvent): string | undefined {
  if (!event.detail || ROUTINE_DETAILS.has(event.detail.toLowerCase())) return undefined;
  return event.detail;
}

export function eventText(event: GameEvent): string {
  if (event.type === 'substitution' && event.playerName) {
    return event.assistName ? `${event.playerName} ⇄ ${event.assistName}` : event.playerName;
  }
  if (event.playerName) return event.playerName;
  return eventDetail(event) ?? messages().events[event.type].title;
}

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTitle(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

// "Today" / "Yesterday" / "Tomorrow", otherwise a short weekday and date.
export function formatDayLabel(date: string, today: string): string {
  const offset = daysBetween(today, date);
  if (Math.abs(offset) <= 1) {
    const label = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }).format(offset, 'day');
    return label.charAt(0).toLocaleUpperCase(getLocale()) + label.slice(1);
  }
  return new Date(`${date}T12:00:00`).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortCode(name: string): string {
  return (
    name
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase() || name.slice(0, 3)
  );
}
