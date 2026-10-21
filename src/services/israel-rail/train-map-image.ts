import type { CanvasRenderingContext2D } from 'canvas';
import { COLORS as BASE_COLORS, createScaledCanvas, drawArrow, drawBadge, drawDot, drawText, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';
import type { RailStation, TrainLine, TrainProgress } from './types';

type Labels = {
  readonly train: (n: number) => string;
  readonly onTime: string;
  readonly delay: (n: number) => string;
  readonly notStarted: (station: string, time: string) => string;
  readonly finished: string;
  readonly updated: (time: string) => string;
  readonly estimated: string;
  readonly board: string;
  readonly getOff: string;
};

const WIDTH = 640;
const MARGIN = 16;
const PADDING = 24;
const HEADER_HEIGHT = 96;
const ROW_HEIGHT = 40;

const COLORS = {
  background: BASE_COLORS.background,
  card: BASE_COLORS.card,
  cardBorder: BASE_COLORS.cardBorder,
  text: BASE_COLORS.text,
  muted: BASE_COLORS.muted,
  line: BASE_COLORS.primary,
  passed: BASE_COLORS.cardBorder,
  train: BASE_COLORS.accent,
  highlightBg: BASE_COLORS.infoBg,
  highlightText: BASE_COLORS.infoText,
  waitBg: BASE_COLORS.warningBg,
  waitText: BASE_COLORS.warningText,
  onTimeBg: BASE_COLORS.successBg,
  onTimeText: BASE_COLORS.successText,
  delayBg: BASE_COLORS.dangerBg,
  delayText: BASE_COLORS.dangerText,
} as const;

const LABELS: Record<ImageLanguage, Labels> = {
  he: {
    train: (n) => `רכבת ${n}`,
    onTime: 'בזמן',
    delay: (n) => `עיכוב ${n} דק׳`,
    notStarted: (station, time) => `טרם יצאה · יוצאת מ${station} ב-${time}`,
    finished: 'הגיעה ליעד',
    updated: (time) => `עודכן ${time}`,
    estimated: 'מיקום משוער לפי לוח הזמנים',
    board: 'עלייה',
    getOff: 'ירידה',
  },
  en: {
    train: (n) => `Train ${n}`,
    onTime: 'On time',
    delay: (n) => `${n} min late`,
    notStarted: (station, time) => `Not departed yet · leaves ${station} at ${time}`,
    finished: 'Arrived',
    updated: (time) => `Updated ${time}`,
    estimated: 'Position estimated from the timetable',
    board: 'Board',
    getOff: 'Get off',
  },
};

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getStatusBadge(line: TrainLine, progress: TrainProgress, labels: Labels, name: (station: RailStation) => string): { readonly text: string; readonly bg: string; readonly color: string } {
  if (progress.status === 'not_started') {
    const [first] = line.stops;
    return { text: labels.notStarted(name(first.station), first.time), bg: COLORS.waitBg, color: COLORS.waitText };
  }
  if (progress.status === 'finished') return { text: labels.finished, bg: COLORS.highlightBg, color: COLORS.highlightText };
  if (progress.delayMinutes > 0) return { text: labels.delay(progress.delayMinutes), bg: COLORS.delayBg, color: COLORS.delayText };
  return { text: labels.onTime, bg: COLORS.onTimeBg, color: COLORS.onTimeText };
}

function drawTrainMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.train;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.card;
  ctx.stroke();
  // Simple front view of a train: body, window and two wheels
  ctx.fillStyle = COLORS.card;
  roundRect(ctx, x - 6, y - 8, 12, 13, 3);
  ctx.fill();
  ctx.fillStyle = COLORS.train;
  ctx.fillRect(x - 4, y - 6, 8, 4);
  ctx.fillStyle = COLORS.card;
  ctx.beginPath();
  ctx.arc(x - 3.5, y + 7.5, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 3.5, y + 7.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

// Renders the train's whole line as a vertical timeline with the user's stations highlighted and the train's current position.
export function generateTrainMapImage(line: TrainLine, progress: TrainProgress, language: ImageLanguage = 'he', updatedAt = ''): Buffer {
  if (!line.stops.length) {
    throw new Error('Cannot render a train map without stops');
  }
  const rtl = language === 'he';
  const labels = LABELS[language];
  const name = (station: RailStation) => (rtl ? station.nameHe : station.nameEn);
  const cardHeight = PADDING * 2 + HEADER_HEIGHT + line.stops.length * ROW_HEIGHT;
  const { canvas, ctx } = createScaledCanvas(WIDTH, cardHeight + MARGIN * 2, COLORS.background);
  // Without an RTL base direction, mixed Hebrew/number strings get their numbers reordered
  ctx.direction = rtl ? 'rtl' : 'ltr';

  const top = MARGIN;
  const left = MARGIN;
  const right = WIDTH - MARGIN;
  ctx.fillStyle = COLORS.card;
  roundRect(ctx, left, top, right - left, cardHeight, 18);
  ctx.fill();
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const start = rtl ? right - PADDING : left + PADDING;
  const end = rtl ? left + PADDING : right - PADDING;
  const align = rtl ? 'right' : 'left';
  const oppositeAlign = rtl ? 'left' : 'right';
  const dir = rtl ? -1 : 1;

  const titleY = top + PADDING + 14;
  const afterTitle = drawText(ctx, labels.train(line.trainNumber), start, titleY, 26, COLORS.text, align);
  const status = getStatusBadge(line, progress, labels, name);
  drawBadge(ctx, status.text, afterTitle + dir * 12, titleY, status.bg, status.color, rtl);
  if (updatedAt) drawText(ctx, labels.updated(updatedAt), end, titleY, 14, COLORS.muted, oppositeAlign);

  const routeY = titleY + 34;
  const afterFirst = drawText(ctx, name(line.stops[0].station), start, routeY, 16, COLORS.muted, align);
  const arrowStart = afterFirst + dir * 10;
  const arrowEnd = arrowStart + dir * 24;
  drawArrow(ctx, arrowStart, arrowEnd, routeY);
  drawText(ctx, name(line.stops[line.stops.length - 1].station), arrowEnd + dir * 10, routeY, 16, COLORS.muted, align);
  if (progress.status === 'running' && !progress.isLive) drawText(ctx, labels.estimated, start, routeY + 26, 13, COLORS.muted, align);

  const lineX = start + dir * 10;
  const textX = lineX + dir * 26;
  const firstY = top + PADDING + HEADER_HEIGHT + ROW_HEIGHT / 2;
  const centerOf = (index: number) => firstY + index * ROW_HEIGHT;
  const lastY = centerOf(line.stops.length - 1);
  const started = progress.status !== 'not_started';
  const trainY = centerOf(progress.position);

  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  if (started) {
    ctx.strokeStyle = COLORS.passed;
    ctx.beginPath();
    ctx.moveTo(lineX, firstY);
    ctx.lineTo(lineX, trainY);
    ctx.stroke();
  }
  if (!started || trainY < lastY) {
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath();
    ctx.moveTo(lineX, started ? trainY : firstY);
    ctx.lineTo(lineX, lastY);
    ctx.stroke();
  }

  const showExpected = started && progress.status === 'running' && progress.delayMinutes > 0;
  line.stops.forEach((stop, index) => {
    const center = centerOf(index);
    const passed = started && index <= progress.position;
    const isEnd = index === 0 || index === line.stops.length - 1;
    const color = passed ? COLORS.passed : COLORS.line;
    drawDot(ctx, lineX, center, isEnd ? color : COLORS.card, color, 7);

    const isBoarding = stop.station.id === line.boardingStationId;
    const isAlighting = stop.station.id === line.alightingStationId;
    const highlighted = isBoarding || isAlighting;
    const textColor = passed ? COLORS.muted : COLORS.text;
    const afterName = drawText(ctx, name(stop.station), textX, center, highlighted ? 18 : 16, textColor, align);
    if (highlighted) drawBadge(ctx, isBoarding ? labels.board : labels.getOff, afterName + dir * 10, center, COLORS.highlightBg, COLORS.highlightText, rtl);

    if (showExpected && !passed) {
      const afterExpected = drawText(ctx, addMinutes(stop.time, progress.delayMinutes), end, center, 16, COLORS.delayText, oppositeAlign);
      drawText(ctx, stop.time, afterExpected - dir * 8, center, 13, COLORS.muted, oppositeAlign);
    } else {
      drawText(ctx, stop.time, end, center, 16, textColor, oppositeAlign);
    }
  });

  if (started) drawTrainMarker(ctx, lineX, trainY);

  return canvas.toBuffer('image/png');
}
