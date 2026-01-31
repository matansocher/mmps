import { getSessionsByDateRange, type SugarSession } from '@shared/sugar';
import { getDateRange, type DateRangeType } from './date-utils';
import { calculateAverageMetrics } from './metrics-utils';

type QueryTrendsParams = {
  readonly chatId: number;
  readonly dateRange?: DateRangeType;
};

export async function handleQueryTrends({ chatId, dateRange }: QueryTrendsParams): Promise<string> {
  const range = dateRange || 'week';
  const { start, end } = getDateRange(range);
  const sessions = await getSessionsByDateRange(chatId, start, end);

  if (sessions.length === 0) {
    return JSON.stringify({ success: true, message: `No sessions found for ${range}`, count: 0 });
  }

  const avgMetrics = calculateAverageMetrics(sessions);
  const byMealType = sessions.reduce(
    (acc, s) => {
      const type = s.mealType || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(s);
      return acc;
    },
    {} as Record<string, SugarSession[]>
  );

  const mealTypeStats = Object.entries(byMealType).map(([type, typeSessions]) => {
    const stats = calculateAverageMetrics(typeSessions);
    return { type, count: typeSessions.length, avgPeak: stats.avgPeak, avgDelta: stats.avgDelta };
  });

  return JSON.stringify({
    success: true,
    dateRange: range,
    sessionCount: sessions.length,
    overall: {
      avgPeak: `${avgMetrics.avgPeak} mg/dL`,
      avgDelta: `+${avgMetrics.avgDelta} mg/dL`,
      avgPeakTime: `${avgMetrics.avgPeakTime} minutes`,
    },
    byMealType: mealTypeStats,
  });
}
