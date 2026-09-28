import type { RunRecord } from './progress';

export const GAME_MILESTONES = [
  { game: 'grid-recall', title: 'A clearer picture', description: 'Recall a pattern of 5 tiles', metric: 'Largest pattern', target: 5 },
  { game: 'pair-match', title: 'Perfect partners', description: 'Clear 2 boards in one round', metric: 'Boards cleared', target: 2 },
  { game: 'sequence-echo', title: 'In the groove', description: 'Repeat a 6-pad sequence', metric: 'Longest completed', target: 6 },
  { game: 'sequence-track', title: 'Eyes on the prize', description: 'Reach tracking round 4', metric: 'Round reached', target: 4 },
  { game: 'odd-one-out', title: 'A keen eye', description: 'Spot 10 different tiles', metric: 'Rounds cleared', target: 10 },
  { game: 'flash-match', title: 'Quick connection', description: 'Make 10 matches in a row', metric: 'Best streak', target: 10 },
  { game: 'quick-math', title: 'It adds up', description: 'Solve 15 problems in one round', metric: 'Solved', target: 15 },
  { game: 'raindrops', title: 'Clear skies', description: 'Clear 10 drops in one round', metric: 'Solved', target: 10 },
  { game: 'color-clash', title: 'True colors', description: 'Choose 10 ink colors in a row', metric: 'Best combo', target: 10 },
  { game: 'rail-router', title: 'Right on track', description: 'Deliver at least 8 trains with no wrong stations', metric: 'Correct deliveries', target: 8 },
  { game: 'ebb-flow', title: 'Go with the flow', description: 'Follow 10 rules in a row', metric: 'Best streak', target: 10 },
  { game: 'block-escape', title: 'Room to breathe', description: 'Solve one puzzle on the best route without hints', metric: 'Friends freed', target: 1 },
  { game: 'order-up', title: 'On the house', description: 'Finish a shift with every order correct', metric: 'Accuracy', target: 100 },
  { game: 'shape-shift', title: 'A new perspective', description: 'Match 10 shapes with at least 90% accuracy', metric: 'Shapes matched', target: 10 },
] as const;
export function metric(run: RunRecord, label: string): number {
  return Number.parseFloat(run.stats?.find((s) => s.label === label)?.value ?? '0');
}
export function earnsGameMilestone(run: RunRecord): boolean {
  const milestone = GAME_MILESTONES.find((m) => m.game === run.gameId);
  if (!milestone || metric(run, milestone.metric) < milestone.target) return false;
  if (run.gameId === 'rail-router') return metric(run, 'Wrong stations') === 0;
  if (run.gameId === 'block-escape') return (run.mode === 'daily' || run.mode === 'practice') && metric(run, 'Hints used') === 0 && run.score === 1000;
  if (run.gameId === 'shape-shift') return metric(run, 'Accuracy') >= 90;
  return true;
}
