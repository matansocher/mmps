import { getSessionsByFood } from '@shared/sugar';
import { calculateAverageMetrics } from './metrics-utils';

type CompareFoodsParams = {
  readonly chatId: number;
  readonly compareFoods?: string[];
};

export async function handleCompareFoods({ chatId, compareFoods }: CompareFoodsParams): Promise<string> {
  if (!compareFoods || compareFoods.length < 2) {
    return JSON.stringify({ success: false, error: 'compareFoods requires at least 2 food names' });
  }

  const comparisons = await Promise.all(
    compareFoods.map(async (food) => {
      const sessions = await getSessionsByFood(chatId, food);
      const stats = calculateAverageMetrics(sessions);
      return { food, sessionCount: sessions.length, ...stats };
    })
  );

  const validComparisons = comparisons.filter((c) => c.count > 0);
  if (validComparisons.length === 0) {
    return JSON.stringify({ success: true, message: 'No data found for any of the specified foods' });
  }

  const sorted = [...validComparisons].sort((a, b) => a.avgDelta - b.avgDelta);

  return JSON.stringify({
    success: true,
    comparison: sorted.map((c) => ({
      food: c.food,
      sessions: c.count,
      avgPeak: `${c.avgPeak} mg/dL`,
      avgDelta: `+${c.avgDelta} mg/dL`,
      avgPeakTime: `${c.avgPeakTime} min`,
    })),
    recommendation: sorted.length > 0 ? `${sorted[0].food} has the lowest glucose impact` : null,
  });
}
