import type { CanvasRenderingContext2D } from 'canvas';
import { COLORS as BASE_COLORS, createScaledCanvas, drawText, font, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';

export type HourlyChartPoint = {
  readonly hour: number;
  readonly temperature: number;
  readonly chanceOfRain: number;
};

export type HourlyChartData = {
  readonly location: string;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly hours: readonly HourlyChartPoint[];
};

export type DailyForecastDay = {
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly temperatureMin: number;
  readonly temperatureMax: number;
  readonly chanceOfRain: number;
  readonly condition: string;
};

export type DailyForecastData = {
  readonly location: string;
  readonly days: readonly DailyForecastDay[];
};

type WeatherIcon = 'sun' | 'cloud' | 'rain';

type Labels = {
  readonly temperature: string;
  readonly rain: string;
  readonly high: string;
  readonly low: string;
  readonly weekdays: readonly string[];
};

const WIDTH = 640;
const MARGIN = 16;
const PADDING = 22;
const HEADER_HEIGHT = 74;
const LEGEND_HEIGHT = 30;
const CHART_HEIGHT = 230;
const AXIS_HEIGHT = 30;
const TILE_HEIGHT = 178;
const TILE_GAP = 8;
const MAX_DAYS = 7;

const COLORS = {
  ...BASE_COLORS,
  temperature: BASE_COLORS.accent,
  rainBar: '#9cc5f5',
  rainText: BASE_COLORS.infoText,
  grid: '#e9edf2',
  sun: '#f2b632',
  cloud: '#aab4c0',
} as const;

const LABELS: Record<ImageLanguage, Labels> = {
  he: {
    temperature: 'טמפרטורה',
    rain: 'סיכוי לגשם',
    high: 'מקס׳',
    low: 'מינ׳',
    weekdays: ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'],
  },
  en: {
    temperature: 'Temperature',
    rain: 'Rain chance',
    high: 'High',
    low: 'Low',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
};

const RAIN_KEYWORDS = /rain|drizzle|shower|storm|thunder|snow|sleet|גשם|ממטר|סופ|שלג|סער/i;
const CLOUD_KEYWORDS = /cloud|overcast|fog|mist|haze|ענן|מעונן|ערפל|אובך/i;

export function getWeatherIcon(condition: string, chanceOfRain: number): WeatherIcon {
  if (chanceOfRain >= 50 || RAIN_KEYWORDS.test(condition)) return 'rain';
  if (CLOUD_KEYWORDS.test(condition)) return 'cloud';
  return 'sun';
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatShortDate(date: string): string {
  const parsed = parseDate(date);
  return `${parsed.getUTCDate()}/${parsed.getUTCMonth() + 1}`;
}

function weekday(date: string, labels: Labels): string {
  return labels.weekdays[parseDate(date).getUTCDay()];
}

// The bundled font has no degree glyph, so the degree mark is drawn as a small ring after the number.
function drawTemperature(ctx: CanvasRenderingContext2D, value: number, x: number, y: number, size: number, color: string, align: 'left' | 'right' | 'center'): void {
  const text = `${Math.round(value)}`;
  ctx.font = font(size);
  const textWidth = ctx.measureText(text).width;
  const ringRadius = Math.max(2, size * 0.13);
  const totalWidth = textWidth + ringRadius * 2 + 3;
  const startX = align === 'left' ? x : align === 'right' ? x - totalWidth : x - totalWidth / 2;
  drawText(ctx, text, startX, y, size, color, 'left');
  ctx.beginPath();
  ctx.arc(startX + textWidth + ringRadius + 2, y - size * 0.3, ringRadius, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, size * 0.09);
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawHeader(ctx: CanvasRenderingContext2D, title: string, subtitle: string, rtl: boolean): void {
  const x = rtl ? WIDTH - MARGIN - PADDING : MARGIN + PADDING;
  const align = rtl ? 'right' : 'left';
  drawText(ctx, title, x, MARGIN + 28, 22, COLORS.text, align);
  drawText(ctx, subtitle, x, MARGIN + 56, 14, COLORS.muted, align);
}

function drawCard(ctx: CanvasRenderingContext2D, height: number): void {
  roundRect(ctx, MARGIN, MARGIN, WIDTH - MARGIN * 2, height - MARGIN * 2, 18);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.stroke();
}

function drawLegend(ctx: CanvasRenderingContext2D, labels: Labels, y: number, rtl: boolean): void {
  const items = [
    { label: labels.temperature, draw: (x: number) => drawLineSwatch(ctx, x, y) },
    { label: labels.rain, draw: (x: number) => drawBarSwatch(ctx, x, y) },
  ];
  let edge = rtl ? WIDTH - MARGIN - PADDING : MARGIN + PADDING;
  for (const item of items) {
    const swatchX = rtl ? edge - 18 : edge;
    item.draw(swatchX);
    const textEdge = rtl ? swatchX - 6 : swatchX + 24;
    const farEdge = drawText(ctx, item.label, textEdge, y, 13, COLORS.muted, rtl ? 'right' : 'left');
    edge = rtl ? farEdge - 20 : farEdge + 20;
  }
}

function drawLineSwatch(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = COLORS.temperature;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 18, y);
  ctx.stroke();
}

function drawBarSwatch(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = COLORS.rainBar;
  roundRect(ctx, x + 3, y - 7, 12, 14, 3);
  ctx.fill();
}

export function generateHourlyChartImage(data: HourlyChartData, language: ImageLanguage): Buffer {
  const rtl = language === 'he';
  const labels = LABELS[language];
  const hours = [...data.hours].sort((a, b) => a.hour - b.hour);
  const height = MARGIN * 2 + HEADER_HEIGHT + LEGEND_HEIGHT + CHART_HEIGHT + AXIS_HEIGHT + 12;
  const { canvas, ctx } = createScaledCanvas(WIDTH, height);
  drawCard(ctx, height);

  const temps = hours.map((h) => h.temperature);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const subtitle = `${weekday(data.date, labels)} ${formatShortDate(data.date)}`;
  drawHeader(ctx, data.location, subtitle, rtl);

  // High/low summary on the opposite side of the title.
  const summaryY = MARGIN + 42;
  const summaryX = rtl ? MARGIN + PADDING : WIDTH - MARGIN - PADDING;
  const summaryAlign = rtl ? 'left' : 'right';
  const lowX = rtl ? summaryX + 62 : summaryX - 62;
  drawText(ctx, labels.high, summaryX, summaryY - 12, 12, COLORS.muted, summaryAlign);
  drawTemperature(ctx, maxTemp, summaryX, summaryY + 10, 20, COLORS.temperature, summaryAlign);
  drawText(ctx, labels.low, lowX, summaryY - 12, 12, COLORS.muted, summaryAlign);
  drawTemperature(ctx, minTemp, lowX, summaryY + 10, 20, COLORS.rainText, summaryAlign);

  drawLegend(ctx, labels, MARGIN + HEADER_HEIGHT + 8, rtl);

  const chartTop = MARGIN + HEADER_HEIGHT + LEGEND_HEIGHT + 22;
  const chartBottom = chartTop + CHART_HEIGHT - 22;
  const chartLeft = MARGIN + PADDING;
  const chartRight = WIDTH - MARGIN - PADDING;
  const slot = (chartRight - chartLeft) / hours.length;
  const xAt = (index: number): number => (rtl ? chartRight - slot * (index + 0.5) : chartLeft + slot * (index + 0.5));

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (const fraction of [0, 0.5, 1]) {
    const y = chartBottom - (chartBottom - chartTop) * fraction;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
  }

  const barWidth = Math.max(4, slot * 0.62);
  hours.forEach((point, index) => {
    const rain = Math.max(0, Math.min(100, point.chanceOfRain));
    if (!rain) return;
    const barHeight = Math.max(3, ((chartBottom - chartTop) * rain) / 100);
    ctx.fillStyle = COLORS.rainBar;
    roundRect(ctx, xAt(index) - barWidth / 2, chartBottom - barHeight, barWidth, barHeight, Math.min(4, barWidth / 2));
    ctx.fill();
  });

  // Temperature uses the upper part of the chart so labels never collide with tall rain bars at the bottom.
  const tempTop = chartTop + 22;
  const tempBottom = chartBottom - 40;
  const range = Math.max(1, maxTemp - minTemp);
  const yAt = (temp: number): number => tempBottom - ((temp - minTemp) / range) * (tempBottom - tempTop);

  ctx.strokeStyle = COLORS.temperature;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  hours.forEach((point, index) => {
    const method = index === 0 ? 'moveTo' : 'lineTo';
    ctx[method](xAt(index), yAt(point.temperature));
  });
  ctx.stroke();

  const labelEvery = hours.length > 12 ? 3 : 1;
  hours.forEach((point, index) => {
    const isLabeled = index % labelEvery === 0;
    const x = xAt(index);
    const y = yAt(point.temperature);
    if (isLabeled) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.background;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = COLORS.temperature;
      ctx.stroke();
      drawTemperature(ctx, point.temperature, x, y - 16, 13, COLORS.text, 'center');
      if (point.chanceOfRain >= 20) {
        centerText(ctx, `${Math.round(point.chanceOfRain)}%`, x, chartBottom - 10, 11, COLORS.rainText);
      }
      centerText(ctx, `${String(point.hour).padStart(2, '0')}:00`, x, chartBottom + 18, 12, COLORS.muted);
    }
  });

  return canvas.toBuffer('image/png');
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.strokeStyle = COLORS.sun;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * (radius + 4), y + Math.sin(angle) * (radius + 4));
    ctx.lineTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.sun;
  ctx.fill();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - size * 0.45, y + size * 0.1, size * 0.38, 0, Math.PI * 2);
  ctx.arc(x, y - size * 0.15, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.48, y + size * 0.08, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  roundRect(ctx, x - size * 0.85, y + size * 0.05, size * 1.7, size * 0.45, size * 0.22);
  ctx.fill();
}

function drawWeatherIcon(ctx: CanvasRenderingContext2D, icon: WeatherIcon, x: number, y: number): void {
  if (icon === 'sun') {
    drawSun(ctx, x, y, 11);
    return;
  }
  if (icon === 'cloud') {
    drawSun(ctx, x + 9, y - 8, 7);
    drawCloud(ctx, x - 2, y + 2, 20, COLORS.cloud);
    return;
  }
  drawCloud(ctx, x, y - 4, 19, COLORS.cloud);
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const offset of [-9, 0, 9]) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + 12);
    ctx.lineTo(x + offset - 3, y + 19);
    ctx.stroke();
  }
}

export function generateDailyForecastImage(data: DailyForecastData, language: ImageLanguage): Buffer {
  const rtl = language === 'he';
  const labels = LABELS[language];
  const days = [...data.days].sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX_DAYS);
  const height = MARGIN * 2 + HEADER_HEIGHT + TILE_HEIGHT + PADDING;
  const { canvas, ctx } = createScaledCanvas(WIDTH, height);
  drawCard(ctx, height);

  const subtitle = `${formatShortDate(days[0].date)} - ${formatShortDate(days[days.length - 1].date)}`;
  drawHeader(ctx, data.location, subtitle, rtl);

  const areaLeft = MARGIN + PADDING;
  const areaWidth = WIDTH - (MARGIN + PADDING) * 2;
  const tileWidth = Math.min(120, (areaWidth - TILE_GAP * (days.length - 1)) / days.length);
  const stripWidth = tileWidth * days.length + TILE_GAP * (days.length - 1);
  const stripLeft = areaLeft + (areaWidth - stripWidth) / 2;
  const top = MARGIN + HEADER_HEIGHT;
  const allMax = Math.max(...days.map((d) => d.temperatureMax));
  const allMin = Math.min(...days.map((d) => d.temperatureMin));

  days.forEach((day, index) => {
    const position = rtl ? days.length - 1 - index : index;
    const x = stripLeft + position * (tileWidth + TILE_GAP);
    const centerX = x + tileWidth / 2;
    roundRect(ctx, x, top, tileWidth, TILE_HEIGHT, 14);
    ctx.fillStyle = COLORS.background;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.stroke();

    centerText(ctx, weekday(day.date, labels), centerX, top + 20, 14, COLORS.text);
    centerText(ctx, formatShortDate(day.date), centerX, top + 38, 11, COLORS.muted);

    drawWeatherIcon(ctx, getWeatherIcon(day.condition, day.chanceOfRain), centerX, top + 68);

    // A mini range bar shows where this day's high/low sit within the whole period.
    const barTop = top + 98;
    const barHeight = 34;
    const range = Math.max(1, allMax - allMin);
    const highY = barTop + ((allMax - day.temperatureMax) / range) * barHeight;
    const lowY = barTop + ((allMax - day.temperatureMin) / range) * barHeight;
    const barX = x + 14;
    roundRect(ctx, barX - 2.5, barTop, 5, barHeight, 2.5);
    ctx.fillStyle = COLORS.grid;
    ctx.fill();
    roundRect(ctx, barX - 2.5, highY, 5, Math.max(5, lowY - highY), 2.5);
    ctx.fillStyle = COLORS.temperature;
    ctx.fill();

    drawTemperature(ctx, day.temperatureMax, centerX + 6, barTop + 6, 17, COLORS.text, 'center');
    drawTemperature(ctx, day.temperatureMin, centerX + 6, barTop + 28, 14, COLORS.muted, 'center');

    const rain = Math.round(day.chanceOfRain);
    const pillWidth = Math.min(tileWidth - 16, 58);
    roundRect(ctx, centerX - pillWidth / 2, top + TILE_HEIGHT - 32, pillWidth, 20, 10);
    ctx.fillStyle = rain >= 20 ? COLORS.infoBg : COLORS.card;
    ctx.fill();
    drawRainDrop(ctx, centerX - pillWidth / 2 + 12, top + TILE_HEIGHT - 22, rain >= 20 ? COLORS.primary : COLORS.cloud);
    centerText(ctx, `${rain}%`, centerX + 6, top + TILE_HEIGHT - 21, 12, rain >= 20 ? COLORS.rainText : COLORS.muted);
  });

  return canvas.toBuffer('image/png');
}

function centerText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawRainDrop(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.quadraticCurveTo(x + 5, y + 1, x + 4, y + 3);
  ctx.arc(x, y + 2, 4, 0, Math.PI);
  ctx.quadraticCurveTo(x - 5, y + 1, x, y - 6);
  ctx.fill();
}
