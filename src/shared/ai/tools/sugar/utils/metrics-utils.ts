import { calculateSessionMetrics, type SugarSession } from '@shared/sugar';

export type AverageMetrics = {
  readonly avgPeak: number;
  readonly avgDelta: number;
  readonly avgPeakTime: number;
  readonly count: number;
};

export function calculateAverageMetrics(sessions: SugarSession[]): AverageMetrics {
  const metricsArray = sessions.map(calculateSessionMetrics).filter((m) => m.readingCount > 0);

  if (metricsArray.length === 0) {
    return { avgPeak: 0, avgDelta: 0, avgPeakTime: 0, count: 0 };
  }

  const avgPeak = metricsArray.reduce((sum, m) => sum + m.peakValue, 0) / metricsArray.length;
  const deltaSessions = metricsArray.filter((m) => m.delta !== null);
  const avgDelta = deltaSessions.length > 0 ? deltaSessions.reduce((sum, m) => sum + (m.delta || 0), 0) / deltaSessions.length : 0;
  const avgPeakTime = metricsArray.reduce((sum, m) => sum + m.peakTime, 0) / metricsArray.length;

  return {
    avgPeak: Math.round(avgPeak),
    avgDelta: Math.round(avgDelta),
    avgPeakTime: Math.round(avgPeakTime),
    count: metricsArray.length,
  };
}
