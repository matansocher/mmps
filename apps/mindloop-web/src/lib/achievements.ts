import { GAMES } from './games';
import { getBestScore } from './storage';
import {
  getGamesPlayedCount,
  getStreak,
  getTotalPlays,
} from './history';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  /** 0..1 progress toward unlocking. */
  progress: number;
}

/** Best single-run score achieved across all games. */
function topScore(): number {
  let top = 0;
  for (const g of GAMES) {
    const b = getBestScore(g.id);
    if (b > top) top = b;
  }
  return top;
}

export function getAchievements(): Achievement[] {
  const totalPlays = getTotalPlays();
  const distinct = getGamesPlayedCount();
  const streak = getStreak();
  const top = topScore();
  const totalGames = GAMES.length;

  const clampProgress = (value: number, target: number) =>
    Math.max(0, Math.min(1, target === 0 ? 0 : value / target));

  const list: Achievement[] = [
    {
      id: 'first-steps',
      title: 'First Steps',
      description: 'Play your very first game',
      icon: '👟',
      unlocked: totalPlays >= 1,
      progress: clampProgress(totalPlays, 1),
    },
    {
      id: 'getting-warmed-up',
      title: 'Getting Warmed Up',
      description: 'Play 10 games',
      icon: '🔥',
      unlocked: totalPlays >= 10,
      progress: clampProgress(totalPlays, 10),
    },
    {
      id: 'dedicated',
      title: 'Dedicated',
      description: 'Play 50 games',
      icon: '💪',
      unlocked: totalPlays >= 50,
      progress: clampProgress(totalPlays, 50),
    },
    {
      id: 'centurion',
      title: 'Centurion',
      description: 'Play 100 games',
      icon: '💯',
      unlocked: totalPlays >= 100,
      progress: clampProgress(totalPlays, 100),
    },
    {
      id: 'explorer',
      title: 'Explorer',
      description: 'Try 5 different games',
      icon: '🧭',
      unlocked: distinct >= 5,
      progress: clampProgress(distinct, 5),
    },
    {
      id: 'completionist',
      title: 'Completionist',
      description: 'Try every game at least once',
      icon: '🗺️',
      unlocked: distinct >= totalGames,
      progress: clampProgress(distinct, totalGames),
    },
    {
      id: 'high-scorer',
      title: 'High Scorer',
      description: 'Score 500+ in any game',
      icon: '⭐',
      unlocked: top >= 500,
      progress: clampProgress(top, 500),
    },
    {
      id: 'elite',
      title: 'Elite',
      description: 'Score 1000+ in any game',
      icon: '🌟',
      unlocked: top >= 1000,
      progress: clampProgress(top, 1000),
    },
    {
      id: 'on-a-roll',
      title: 'On a Roll',
      description: 'Reach a 3-day streak',
      icon: '📅',
      unlocked: streak >= 3,
      progress: clampProgress(streak, 3),
    },
    {
      id: 'unstoppable',
      title: 'Unstoppable',
      description: 'Reach a 7-day streak',
      icon: '🚀',
      unlocked: streak >= 7,
      progress: clampProgress(streak, 7),
    },
  ];

  return list;
}

export function getUnlockedCount(): number {
  return getAchievements().filter((a) => a.unlocked).length;
}
