import { GAME_MILESTONES, getProgress, progressCounts, streakForDays } from './progress';

export type Achievement = { readonly id: string; readonly title: string; readonly description: string; readonly unlocked: boolean; readonly progress: number; readonly icon: string };
const DEFINITIONS = [
  ['first-steps', 'First little win', 'Complete your first round', 1, 'plays'],
  ['getting-warmed-up', 'Finding your rhythm', 'Complete 10 rounds', 10, 'plays'],
  ['dedicated', 'Making time', 'Complete 50 rounds', 50, 'plays'],
  ['centurion', 'A hundred little wins', 'Complete 100 rounds', 100, 'plays'],
  ['explorer', 'Curious mind', 'Try 5 different games', 5, 'games'],
  ['completionist', 'Around the loop', 'Try all 14 games', 14, 'games'],
  ['daily-loop', 'A moment for you', 'Finish a daily loop', 3, 'daily'],
  ['on-a-roll', 'On a roll', 'Reach a 3-day streak', 3, 'streak'],
  ['unstoppable', 'A week of play', 'Reach a 7-day streak', 7, 'streak'],
] as const;
export function getAchievements(): Achievement[] {
  const progress = getProgress();
  const counts = progressCounts(progress);
  const values = {
    plays: Object.values(counts.games).reduce((a, b) => a + b, 0),
    games: Object.keys(counts.games).filter((g) => g !== 'warm-up').length,
    daily: Math.max(0, ...Object.values(counts.days)),
    streak: streakForDays(Object.keys(counts.days)).longest,
  };
  const list = DEFINITIONS.map(([id, title, description, target, kind]) => ({ id, title, description, unlocked: !!progress.awards[id], progress: Math.min(1, values[kind] / target), icon: 'leaf' }));
  return [
    ...list,
    ...GAME_MILESTONES.map((m) => ({
      id: `mastery-${m.game}`,
      title: m.title,
      description: m.description,
      unlocked: !!progress.awards[`mastery-${m.game}`],
      progress: progress.awards[`mastery-${m.game}`] ? 1 : 0,
      icon: 'leaf',
    })),
    ...['high-scorer', 'elite']
      .filter((id) => progress.awards[id])
      .map((id) => ({
        id,
        title: id === 'elite' ? 'Elite · original collection' : 'High scorer · original collection',
        description: 'Earned before the new scoring system',
        unlocked: true,
        progress: 1,
        icon: 'leaf',
      })),
  ];
}
export function getUnlockedCount(): number {
  return getAchievements().filter((a) => a.unlocked).length;
}
