import type { FlatSeries, League } from '../types';
import { roundWeightFor } from './playoffs';

export type PickResult = {
  readonly series: FlatSeries;
  readonly pickedTeam: string;
  readonly correct: boolean;
  readonly points: number;
};

export function scorePicks(
  league: League,
  series: readonly FlatSeries[],
  picks: Record<number, string>,
): {
  results: PickResult[];
  score: number;
  maxScore: number;
  correctCount: number;
  perfect: boolean;
} {
  const results: PickResult[] = series.map((s, i) => {
    const pickedTeam = picks[i] ?? '';
    const correct = pickedTeam === s.winner;
    const points = correct ? roundWeightFor(league, s.round) : 0;
    return { series: s, pickedTeam, correct, points };
  });
  const score = results.reduce((n, r) => n + r.points, 0);
  const maxScore = series.reduce((n, s) => n + roundWeightFor(league, s.round), 0);
  const correctCount = results.filter((r) => r.correct).length;
  return { results, score, maxScore, correctCount, perfect: correctCount === series.length };
}
