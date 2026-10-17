import type { EventType, GameEvent } from '../types';

export const EVENT_META: Record<EventType, { readonly icon: string; readonly label: string }> = {
  goal: { icon: '⚽', label: 'גולים' },
  redCard: { icon: '🟥', label: 'כרטיסים אדומים' },
  yellowCard: { icon: '🟨', label: 'כרטיסים צהובים' },
  missedPenalty: { icon: '❌', label: 'החמצת פנדל' },
  var: { icon: '📺', label: 'VAR' },
  woodwork: { icon: '🥅', label: 'פגיעה במסגרת' },
  substitution: { icon: '🔄', label: 'חילופים' },
};

export const EVENT_TYPE_ORDER: readonly EventType[] = ['goal', 'redCard', 'missedPenalty', 'var', 'yellowCard', 'woodwork', 'substitution'];

const ROUTINE_DETAILS = new Set(['שער שדה', 'field goal', 'goal']);

export function eventDetail(event: GameEvent): string | undefined {
  if (!event.detail || ROUTINE_DETAILS.has(event.detail.toLowerCase())) return undefined;
  return event.detail;
}

export function eventText(event: GameEvent): string {
  if (event.type === 'substitution' && event.playerName) {
    return event.assistName ? `${event.playerName} ⇄ ${event.assistName}` : event.playerName;
  }
  if (event.playerName) return event.playerName;
  return eventDetail(event) ?? EVENT_META[event.type].label;
}

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatDateTitle(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}
