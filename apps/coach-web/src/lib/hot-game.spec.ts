import type { Game, GameEvent, Side } from '../types';
import { hotReason } from './hot-game';

const NOW = new Date('2025-05-10T20:00:00Z').getTime();

function event(type: GameEvent['type'], minute: number, side: Side): GameEvent {
  return { key: `${type}-${minute}-${side}`, gameId: 1, type, minute, minuteDisplay: `${minute}'`, side };
}

function game(overrides: Partial<Game> & { readonly score?: readonly [number, number] }): Game {
  const [home, away] = overrides.score ?? [0, 0];
  return {
    id: 1,
    competitionId: 1,
    competitionName: 'League',
    startTime: '2025-05-10T19:00:00Z',
    status: 'live',
    statusText: '',
    home: { id: 1, name: 'Home', score: home },
    away: { id: 2, name: 'Away', score: away },
    isFavorite: false,
    lineupsConfirmed: false,
    channels: [],
    events: [],
    ...overrides,
  } as Game;
}

describe('hotReason()', () => {
  test.each([
    { name: 'late goal', g: game({ score: [1, 0], events: [event('goal', 88, 'home')] }), expected: 'lateDrama' },
    { name: 'comeback win', g: game({ score: [1, 2], events: [event('goal', 10, 'home'), event('goal', 50, 'away'), event('goal', 70, 'away')] }), expected: 'comeback' },
    {
      name: 'two-goal comeback to level',
      g: game({ score: [2, 2], events: [event('goal', 5, 'home'), event('goal', 20, 'home'), event('goal', 50, 'away'), event('goal', 70, 'away')] }),
      expected: 'comeback',
    },
    {
      name: 'goal fest',
      g: game({ score: [4, 1], events: [event('goal', 5, 'home'), event('goal', 10, 'home'), event('goal', 20, 'away'), event('goal', 30, 'home'), event('goal', 40, 'home')] }),
      expected: 'goalFest',
    },
    { name: 'red card, close score', g: game({ score: [1, 0], events: [event('goal', 10, 'home'), event('redCard', 30, 'away')] }), expected: 'redCardTension' },
    { name: 'red card, comfortable lead', g: game({ score: [3, 0], events: [event('goal', 10, 'home'), event('goal', 20, 'home'), event('goal', 30, 'home'), event('redCard', 40, 'away')] }), expected: null },
    { name: 'quiet game', g: game({ score: [1, 0], events: [event('goal', 10, 'home')] }), expected: null },
    { name: 'one-goal equaliser', g: game({ score: [1, 1], events: [event('goal', 10, 'home'), event('goal', 50, 'away')] }), expected: null },
    { name: 'upcoming game', g: game({ status: 'scheduled', events: [event('goal', 90, 'home')] }), expected: null },
    { name: 'recently finished', g: game({ status: 'finished', score: [1, 0], events: [event('goal', 90, 'home')] }), expected: 'lateDrama' },
    { name: 'finished long ago', g: game({ status: 'finished', startTime: '2025-05-10T12:00:00Z', score: [1, 0], events: [event('goal', 90, 'home')] }), expected: null },
  ])('should return $expected for $name', ({ g, expected }) => {
    expect(hotReason(g, NOW)).toEqual(expected);
  });
});
