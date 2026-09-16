import { generateLineChartImage } from '@services/chart';
import { WEATHER_CHART_CONFIG } from './constants';
import type { WeatherChartOptions } from './types';

// Renders a "Chart D" style temperature curve by delegating to the generic line-chart renderer:
// the x-axis is the hour of day, the y-axis is temperature (°), and the headline shows the day's low-high range.
export async function generateWeatherChartImage(options: WeatherChartOptions): Promise<string> {
  const { defaultTitle, defaultHighlightHours } = WEATHER_CHART_CONFIG;
  const points = options.points;
  if (!points.length) {
    throw new Error('Cannot render a weather chart without data points');
  }

  const title = options.title ?? defaultTitle;
  const highlightHours = options.highlightHours ?? defaultHighlightHours;

  const temperatures = points.map((point) => point.temperature);
  const low = Math.round(Math.min(...temperatures));
  const peak = Math.round(Math.max(...temperatures));
  const headline = `${low}\u00b0 \u2013 ${peak}\u00b0`;

  return generateLineChartImage({
    title,
    headline,
    fileNamePrefix: 'weather',
    yAxisFormatter: (value) => `${Math.round(value)}\u00b0`,
    points: points.map((point) => ({
      x: point.hour,
      y: point.temperature,
      label: highlightHours.includes(point.hour) ? `${String(point.hour).padStart(2, '0')}:00` : undefined,
    })),
  });
}
