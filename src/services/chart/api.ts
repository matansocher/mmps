import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { Logger } from '@core/utils';
import { LINE_CHART_CONFIG } from './constants';
import type { LineChartColors, LineChartOptions, LineChartPoint } from './types';

const logger = new Logger('chart');

type Scale = {
  readonly min: number;
  readonly max: number;
  readonly minX: number;
  readonly maxX: number;
  readonly px: (x: number) => number;
  readonly py: (y: number) => number;
};

function buildScale(points: ReadonlyArray<LineChartPoint>): Scale {
  const { width, height, padding } = LINE_CHART_CONFIG;
  const ys = points.map((point) => point.y);
  const xs = points.map((point) => point.x);

  // Round the axis to even numbers with a little headroom so the curve never touches the frame.
  const min = Math.floor((Math.min(...ys) - 1) / 2) * 2;
  const max = Math.ceil((Math.max(...ys) + 1) / 2) * 2;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const xSpan = maxX - minX || 1;
  const ySpan = max - min || 1;

  const px = (x: number) => padding.left + ((x - minX) / xSpan) * (width - padding.left - padding.right);
  const py = (y: number) => padding.top + (1 - (y - min) / ySpan) * (height - padding.top - padding.bottom);

  return { min, max, minX, maxX, px, py };
}

function ensureAssetsDir(): string {
  const assetsDir = path.resolve(process.cwd(), 'assets', 'charts');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  return assetsDir;
}

// Renders a "Chart D" style line: gradient area fill, right-aligned headline, and peak/low markers.
// Generic over the x-axis (any numeric position with an optional tick label) and the y-axis formatting.
export async function generateLineChartImage(options: LineChartOptions): Promise<string> {
  const { width, height, padding, gridSteps, font } = LINE_CHART_CONFIG;
  const colors: LineChartColors = { ...LINE_CHART_CONFIG.colors, ...options.colors };
  const points = [...options.points].sort((a, b) => a.x - b.x);
  if (!points.length) {
    throw new Error('Cannot render a line chart without data points');
  }

  const formatY = options.yAxisFormatter ?? ((value: number) => `${Math.round(value)}`);
  const scale = buildScale(points);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const peak = Math.max(...points.map((point) => point.y));
  const low = Math.min(...points.map((point) => point.y));

  // Headline: title + optional right-aligned headline (e.g. a range or total).
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = `600 20px ${font}`;
  ctx.fillStyle = colors.text;
  ctx.fillText(options.title, padding.left, 16);
  if (options.headline) {
    ctx.font = `600 20px ${font}`;
    ctx.fillStyle = colors.muted;
    ctx.fillText(options.headline, width - padding.right - ctx.measureText(options.headline).width, 16);
  }

  // Horizontal gridlines + y axis labels.
  ctx.font = `12px ${font}`;
  ctx.textBaseline = 'middle';
  for (let step = 0; step <= gridSteps; step += 1) {
    const value = scale.min + (step / gridSteps) * (scale.max - scale.min);
    const y = scale.py(value);
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'right';
    ctx.fillText(formatY(value), padding.left - 8, y);
  }

  // Gradient area under the curve.
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, colors.areaTop);
  gradient.addColorStop(1, colors.areaBottom);
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = scale.px(point.x);
    const y = scale.py(point.y);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineTo(scale.px(scale.maxX), height - padding.bottom);
  ctx.lineTo(scale.px(scale.minX), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Value line.
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = scale.px(point.x);
    const y = scale.py(point.y);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Peak and low markers with labels.
  const peakPoint = points.find((point) => point.y === peak)!;
  const lowPoint = points.find((point) => point.y === low)!;
  const markers: ReadonlyArray<{ readonly point: LineChartPoint; readonly color: string }> = [
    { point: peakPoint, color: colors.peak },
    { point: lowPoint, color: colors.low },
  ];
  markers.forEach(({ point, color }) => {
    const x = scale.px(point.x);
    const y = scale.py(point.y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = `600 13px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatY(point.y), x, y - 9);
  });

  // X-axis tick labels for the points that carry one.
  ctx.fillStyle = colors.muted;
  ctx.font = `12px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points
    .filter((point): point is LineChartPoint & { label: string } => !!point.label)
    .forEach((point) => {
      ctx.fillText(point.label, scale.px(point.x), height - padding.bottom + 10);
    });

  const assetsDir = ensureAssetsDir();
  const prefix = options.fileNamePrefix ?? 'chart';
  const outputPath = path.join(assetsDir, `${prefix}_${Date.now()}.png`);
  await fs.promises.writeFile(outputPath, canvas.toBuffer('image/png'));
  logger.log(`Chart saved to: ${outputPath}`);
  return outputPath;
}
