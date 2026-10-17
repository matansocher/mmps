import type { EventType, GameEvent } from '../types';

export const EVENT_META: Record<EventType, { readonly icon: string; readonly label: string; readonly title: string }> = {
  goal: { icon: '⚽', label: 'Goals', title: 'Goal' },
  redCard: { icon: '🟥', label: 'Red cards', title: 'Red card' },
  yellowCard: { icon: '🟨', label: 'Yellow cards', title: 'Yellow card' },
  missedPenalty: { icon: '❌', label: 'Missed penalties', title: 'Missed penalty' },
  var: { icon: '📺', label: 'VAR decisions', title: 'VAR' },
  woodwork: { icon: '🥅', label: 'Woodwork', title: 'Hit the woodwork' },
  substitution: { icon: '🔄', label: 'Substitutions', title: 'Substitution' },
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
  return eventDetail(event) ?? EVENT_META[event.type].title;
}

const LOCALE = 'en-GB';

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatDateTitle(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortCode(name: string): string {
  return name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || name.slice(0, 3);
}
