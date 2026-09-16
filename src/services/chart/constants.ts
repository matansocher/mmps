import type { LineChartColors } from './types';

export const LINE_CHART_CONFIG = {
  width: 900,
  height: 380,
  padding: { top: 56, right: 28, bottom: 44, left: 52 },
  gridSteps: 4,
  font: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  colors: {
    background: '#0e1621',
    text: '#e9edf1',
    muted: '#7d8b99',
    grid: '#22303d',
    line: '#6ab3f3',
    areaTop: 'rgba(106, 179, 243, 0.45)',
    areaBottom: 'rgba(106, 179, 243, 0.02)',
    peak: '#f3776a',
    low: '#6ab3f3',
  } as LineChartColors,
} as const;
