import type { Game } from '../types';
import { EVENT_META, eventText } from './format';

export type GameNotification = {
  readonly key: string;
  readonly gameId: number;
  readonly competitionId: number;
  readonly icon: string;
  readonly title: string;
  readonly text?: string;
  readonly minuteDisplay?: string;
  readonly game: Pick<Game, 'home' | 'away' | 'competitionName' | 'status'>;
};

function gameSnapshot(game: Game): GameNotification['game'] {
  return { home: game.home, away: game.away, competitionName: game.competitionName, status: game.status };
}

// Compares two consecutive polls and returns what changed: new events, kick-offs and full-times.
export function diffGames(previous: readonly Game[], next: readonly Game[]): GameNotification[] {
  const previousById = new Map(previous.map((g) => [g.id, g]));
  const notifications: GameNotification[] = [];

  for (const game of next) {
    const before = previousById.get(game.id);
    if (!before) continue;

    if (before.status === 'scheduled' && game.status === 'live') {
      notifications.push({ key: `${game.id}:kickoff`, gameId: game.id, competitionId: game.competitionId, icon: '🟢', title: 'Kick-off', game: gameSnapshot(game) });
    }

    const seen = new Set(before.events.map((e) => e.key));
    for (const event of game.events) {
      if (seen.has(event.key)) continue;
      const meta = EVENT_META[event.type];
      notifications.push({
        key: event.key,
        gameId: game.id,
        competitionId: game.competitionId,
        icon: meta.icon,
        title: meta.title,
        text: eventText(event),
        minuteDisplay: event.minuteDisplay,
        game: gameSnapshot(game),
      });
    }

    if (before.status === 'live' && game.status === 'finished') {
      notifications.push({ key: `${game.id}:fulltime`, gameId: game.id, competitionId: game.competitionId, icon: '🏁', title: 'Full time', game: gameSnapshot(game) });
    }
  }
  return notifications;
}
