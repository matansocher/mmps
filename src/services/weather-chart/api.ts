import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { Logger } from '@core/utils';
import { WEATHER_CHART_CONFIG } from './constants';
import type { WeatherChartOptions, WeatherChartPoint } from './types';

const logger = new Logger('weather-chart');

const FONT = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

type Scale = {
  readonly min: number;
  readonly max: number;
  readonly minHour: number;
  readonly maxHour: number;
  readonly px: (hour: number) => number;
  readonly py: (temperature: number) => number;
};

function buildScale(points: ReadonlyArray<WeatherChartPoint>): Scale {
  const { width, height, padding } = WEATHER_CHART_CONFIG;
  const temps = points.map((point) => point.temperature);
  const hours = points.map((point) => point.hour);

  // Round the axis to even numbers with a little headroom so the curve never touches the frame.
  const min = Math.floor((Math.min(...temps) - 1) / 2) * 2;
  const max = Math.ceil((Math.max(...temps) + 1) / 2) * 2;
  const minHour = Math.min(...hours);
  const maxHour = Math.max(...hours);
  const hourSpan = maxHour - minHour || 1;
  const tempSpan = max - min || 1;

  const px = (hour: number) => padding.left + ((hour - minHour) / hourSpan) * (width - padding.left - padding.right);
  const py = (temperature: number) => padding.top + (1 - (temperature - min) / tempSpan) * (height - padding.top - padding.bottom);

  return { min, max, minHour, maxHour, px, py };
}

function ensureAssetsDir(): string {
  const assetsDir = path.resolve(process.cwd(), 'assets', 'weather-charts');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  return assetsDir;
}

// Renders a "Chart D" style temperature curve: gradient area fill, day low-high headline, and peak/low markers.
export async function generateWeatherChartImage(options: WeatherChartOptions): Promise<string> {
  const { width, height, padding, gridSteps, colors, defaultTitle, defaultHighlightHours } = WEATHER_CHART_CONFIG;
  const points = [...options.points].sort((a, b) => a.hour - b.hour);
  if (!points.length) {
    throw new Error('Cannot render a weather chart without data points');
  }

  const title = options.title ?? defaultTitle;
  const highlightHours = options.highlightHours ?? defaultHighlightHours;
  const scale = buildScale(points);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const peak = Math.max(...points.map((point) => point.temperature));
  const low = Math.min(...points.map((point) => point.temperature));

  // Headline: title + the day's low-high range.
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = colors.text;
  ctx.fillText(title, padding.left, 16);
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = colors.muted;
  const rangeText = `${Math.round(low)}\u00b0 \u2013 ${Math.round(peak)}\u00b0`;
  ctx.fillText(rangeText, width - padding.right - ctx.measureText(rangeText).width, 16);

  // Horizontal gridlines + temperature axis labels.
  ctx.font = `12px ${FONT}`;
  ctx.textBaseline = 'middle';
  for (let step = 0; step <= gridSteps; step += 1) {
    const temperature = scale.min + (step / gridSteps) * (scale.max - scale.min);
    const y = scale.py(temperature);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(temperature)}\u00b0`, padding.left - 8, y);
  }

  // Gradient area under the curve.
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, colors.areaTop);
  gradient.addColorStop(1, colors.areaBottom);
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = scale.px(point.hour);
    const y = scale.py(point.temperature);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineTo(scale.px(scale.maxHour), height - padding.bottom);
  ctx.lineTo(scale.px(scale.minHour), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Temperature line.
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = scale.px(point.hour);
    const y = scale.py(point.temperature);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Peak and low markers with labels.
  const peakPoint = points.find((point) => point.temperature === peak)!;
  const lowPoint = points.find((point) => point.temperature === low)!;
  const markers: ReadonlyArray<{ readonly point: WeatherChartPoint; readonly color: string }> = [
    { point: peakPoint, color: colors.peak },
    { point: lowPoint, color: colors.low },
  ];
  markers.forEach(({ point, color }) => {
    const x = scale.px(point.hour);
    const y = scale.py(point.temperature);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(point.temperature)}\u00b0`, x, y - 9);
  });

  // Hour labels at the highlighted checkpoints that fall inside the data range.
  ctx.fillStyle = colors.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  highlightHours
    .filter((hour) => hour >= scale.minHour && hour <= scale.maxHour)
    .forEach((hour) => {
      ctx.fillText(`${String(hour).padStart(2, '0')}:00`, scale.px(hour), height - padding.bottom + 10);
    });

  const assetsDir = ensureAssetsDir();
  const outputPath = path.join(assetsDir, `weather_${Date.now()}.png`);
  await fs.promises.writeFile(outputPath, canvas.toBuffer('image/png'));
  logger.log(`Weather chart saved to: ${outputPath}`);
  return outputPath;
}
