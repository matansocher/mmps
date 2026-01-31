import { format } from 'date-fns';
import type { SugarReading, SugarSession, SugarSessionMetrics } from '@shared/sugar';

export function formatReading(reading: SugarReading): string {
  return `${reading.minutesAfterMeal}min: ${reading.value} mg/dL`;
}

export function formatSessionSummary(session: SugarSession, metrics: SugarSessionMetrics): string {
  const date = format(session.startedAt, 'MMM d, yyyy HH:mm');
  const readingsStr = session.readings.map(formatReading).join(', ');
  const metricsStr =
    metrics.delta !== null
      ? `Peak: ${metrics.peakValue} at ${metrics.peakTime}min, Δ${metrics.delta > 0 ? '+' : ''}${metrics.delta}`
      : `Peak: ${metrics.peakValue} at ${metrics.peakTime}min`;

  return `[${date}] ${session.mealDescription}\nReadings: ${readingsStr || 'none'}\n${metricsStr}`;
}
