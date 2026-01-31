import { calculateSessionMetrics, getSessionsByFood } from '@shared/sugar';
import { formatSessionSummary } from './format-utils';
import { calculateAverageMetrics } from './metrics-utils';

type QueryFoodParams = {
  readonly chatId: number;
  readonly foodQuery?: string;
};

export async function handleQueryFood({ chatId, foodQuery }: QueryFoodParams): Promise<string> {
  if (!foodQuery) {
    return JSON.stringify({ success: false, error: 'foodQuery is required' });
  }

  const sessions = await getSessionsByFood(chatId, foodQuery);
  if (sessions.length === 0) {
    return JSON.stringify({ success: true, message: `No sessions found containing "${foodQuery}"`, count: 0 });
  }

  const avgMetrics = calculateAverageMetrics(sessions);
  const recentSessions = sessions.slice(0, 5).map((s) => formatSessionSummary(s, calculateSessionMetrics(s)));

  return JSON.stringify({
    success: true,
    food: foodQuery,
    sessionCount: sessions.length,
    averageMetrics: {
      avgPeak: `${avgMetrics.avgPeak} mg/dL`,
      avgDelta: `+${avgMetrics.avgDelta} mg/dL`,
      avgPeakTime: `${avgMetrics.avgPeakTime} minutes`,
    },
    recentSessions,
  });
}
