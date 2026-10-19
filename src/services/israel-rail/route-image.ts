import type { CanvasRenderingContext2D } from 'canvas';
import { COLORS as BASE_COLORS, createScaledCanvas, drawArrow, drawBadge, drawDot, drawText, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';
import type { RailStation, TrainLeg, TrainTravel } from './types';

export type RouteImageLanguage = ImageLanguage;

type Row =
  | { readonly kind: 'stop'; readonly station: RailStation; readonly time: string; readonly platform: number; readonly isEnd: boolean }
  | { readonly kind: 'ride'; readonly leg: TrainLeg }
  | {
      readonly kind: 'transfer';
      readonly station: RailStation;
      readonly arrivalTime: string;
      readonly departureTime: string;
      readonly fromPlatform: number;
      readonly toPlatform: number;
      readonly waitMinutes: number;
    };

type Labels = {
  readonly minutes: (n: number) => string;
  readonly platform: (n: number) => string;
  readonly platformChange: (from: number, to: number) => string;
  readonly wait: (n: number) => string;
  readonly train: (n: number) => string;
  readonly transfers: (n: number) => string;
  readonly onTime: string;
  readonly delay: (n: number) => string;
};

const WIDTH = 640;
const MARGIN = 16;
const PADDING = 24;
const HEADER_HEIGHT = 78;
const ROW_HEIGHT = { stop: 46, ride: 38, transfer: 66 } as const;

const COLORS = {
  background: BASE_COLORS.background,
  card: BASE_COLORS.card,
  cardBorder: BASE_COLORS.cardBorder,
  text: BASE_COLORS.text,
  muted: BASE_COLORS.muted,
  line: BASE_COLORS.primary,
  transfer: BASE_COLORS.accent,
  platformBg: BASE_COLORS.infoBg,
  platformText: BASE_COLORS.infoText,
  waitBg: BASE_COLORS.warningBg,
  waitText: BASE_COLORS.warningText,
  onTimeBg: BASE_COLORS.successBg,
  onTimeText: BASE_COLORS.successText,
  delayBg: BASE_COLORS.dangerBg,
  delayText: BASE_COLORS.dangerText,
} as const;

const LABELS: Record<RouteImageLanguage, Labels> = {
  he: {
    minutes: (n) => `${n} דק׳`,
    platform: (n) => `רציף ${n}`,
    platformChange: (from, to) => `מרציף ${from} ל-${to}`,
    wait: (n) => `המתנה ${n} דק׳`,
    train: (n) => `רכבת ${n}`,
    transfers: (n) => (n === 0 ? 'ישיר' : n === 1 ? 'החלפה אחת' : `${n} החלפות`),
    onTime: 'בזמן',
    delay: (n) => `עיכוב ${n} דק׳`,
  },
  en: {
    minutes: (n) => `${n} min`,
    platform: (n) => `Platform ${n}`,
    platformChange: (from, to) => `Platform ${from} to ${to}`,
    wait: (n) => `${n} min wait`,
    train: (n) => `Train ${n}`,
    transfers: (n) => (n === 0 ? 'Direct' : n === 1 ? '1 transfer' : `${n} transfers`),
    onTime: 'On time',
    delay: (n) => `${n} min late`,
  },
};

function buildRows(travel: TrainTravel): Row[] {
  const { legs, transferDetails } = travel;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const rows: Row[] = [{ kind: 'stop', station: first.from, time: first.departureTime, platform: first.originPlatform, isEnd: false }];

  legs.forEach((leg, index) => {
    rows.push({ kind: 'ride', leg });
    const transfer = transferDetails[index];
    if (index < legs.length - 1 && transfer) {
      rows.push({
        kind: 'transfer',
        station: transfer.station,
        arrivalTime: transfer.arrivalTime,
        departureTime: transfer.departureTime,
        fromPlatform: transfer.arrivalPlatform,
        toPlatform: transfer.departurePlatform,
        waitMinutes: transfer.waitMinutes,
      });
    }
  });

  rows.push({ kind: 'stop', station: last.to, time: last.arrivalTime, platform: last.destinationPlatform, isEnd: true });
  return rows;
}

function cardHeight(rows: readonly Row[]): number {
  return PADDING * 2 + HEADER_HEIGHT + rows.reduce((sum, row) => sum + ROW_HEIGHT[row.kind], 0);
}

function drawCard(ctx: CanvasRenderingContext2D, travel: TrainTravel, top: number, language: RouteImageLanguage): number {
  const rtl = language === 'he';
  const labels = LABELS[language];
  const rows = buildRows(travel);
  const height = cardHeight(rows);
  // Without an RTL base direction, mixed Hebrew/number strings like "44 דק׳ · …" get their numbers reordered
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const left = MARGIN;
  const right = WIDTH - MARGIN;

  ctx.fillStyle = COLORS.card;
  roundRect(ctx, left, top, right - left, height, 18);
  ctx.fill();
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const start = rtl ? right - PADDING : left + PADDING;
  const end = rtl ? left + PADDING : right - PADDING;
  const align = rtl ? 'right' : 'left';
  const oppositeAlign = rtl ? 'left' : 'right';
  const dir = rtl ? -1 : 1;

  // Header: "departure → arrival · date" in reading order, then duration · transfers
  const titleY = top + PADDING + 18;
  const afterDeparture = drawText(ctx, travel.departureTime, start, titleY, 28, COLORS.text, align);
  const arrowStart = afterDeparture + dir * 12;
  const arrowEnd = arrowStart + dir * 30;
  drawArrow(ctx, arrowStart, arrowEnd, titleY);
  const afterArrival = drawText(ctx, travel.arrivalTime, arrowEnd + dir * 12, titleY, 28, COLORS.text, align);
  const [, month, day] = travel.date.split('-');
  drawText(ctx, `·  ${day}.${month}`, afterArrival + dir * 12, titleY, 20, COLORS.muted, align);
  const meta = [labels.minutes(travel.durationMinutes), labels.transfers(travel.transfers)].join('  ·  ');
  drawText(ctx, meta, start, titleY + 34, 15, COLORS.muted, align);

  const lineX = start + dir * 10;
  const textX = lineX + dir * 24;
  let y = top + PADDING + HEADER_HEIGHT;

  const centers = rows.map((row) => {
    const center = y + ROW_HEIGHT[row.kind] / 2;
    y += ROW_HEIGHT[row.kind];
    return center;
  });
  const dotCenters = rows.map((row, index) => (row.kind === 'ride' ? null : row.kind === 'transfer' ? centers[index] - 10 : centers[index])).filter((c) => c !== null);

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lineX, dotCenters[0]);
  ctx.lineTo(lineX, dotCenters[dotCenters.length - 1]);
  ctx.stroke();

  rows.forEach((row, index) => {
    const center = centers[index];
    const name = (station: RailStation) => (rtl ? station.nameHe : station.nameEn);

    if (row.kind === 'stop') {
      drawDot(ctx, lineX, center, row.isEnd ? COLORS.line : COLORS.background, COLORS.line);
      const afterName = drawText(ctx, name(row.station), textX, center, 18, COLORS.text, align);
      drawBadge(ctx, labels.platform(row.platform), afterName + dir * 10, center, COLORS.platformBg, COLORS.platformText, rtl);
      drawText(ctx, row.time, end, center, 18, COLORS.text, oppositeAlign);
      return;
    }

    if (row.kind === 'ride') {
      const { leg } = row;
      const rideMinutes = minutesBetween(leg.departureTime, leg.arrivalTime);
      const afterRide = drawText(ctx, `${labels.train(leg.trainNumber)}  ·  ${labels.minutes(rideMinutes)}`, textX, center, 14, COLORS.muted, align);
      const late = leg.delayMinutes > 0;
      drawBadge(ctx, late ? labels.delay(leg.delayMinutes) : labels.onTime, afterRide + dir * 10, center, late ? COLORS.delayBg : COLORS.onTimeBg, late ? COLORS.delayText : COLORS.onTimeText, rtl);
      return;
    }

    const nameY = center - 10;
    drawDot(ctx, lineX, nameY, COLORS.transfer, COLORS.transfer);
    const afterName = drawText(ctx, name(row.station), textX, nameY, 18, COLORS.text, align);
    drawBadge(ctx, labels.platformChange(row.fromPlatform, row.toPlatform), afterName + dir * 10, nameY, COLORS.platformBg, COLORS.platformText, rtl);
    drawBadge(ctx, labels.wait(row.waitMinutes), textX, nameY + 26, COLORS.waitBg, COLORS.waitText, rtl);
    drawText(ctx, `${row.arrivalTime}  /  ${row.departureTime}`, end, nameY, 16, COLORS.muted, oppositeAlign);
  });

  return height;
}

function minutesBetween(from: string, to: string): number {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const diff = toMinutes(to) - toMinutes(from);
  return diff < 0 ? diff + 24 * 60 : diff;
}

// Renders a vertical route timeline card per travel (stations, platforms, transfers, delays) as a PNG.
export function generateRouteImage(travels: readonly TrainTravel[], language: RouteImageLanguage = 'he'): Buffer {
  if (!travels.length) {
    throw new Error('Cannot render a route image without travels');
  }
  const heights = travels.map((travel) => cardHeight(buildRows(travel)));
  const totalHeight = MARGIN + heights.reduce((sum, h) => sum + h + MARGIN, 0);

  const { canvas, ctx } = createScaledCanvas(WIDTH, totalHeight, COLORS.background);

  let top = MARGIN;
  travels.forEach((travel) => {
    top += drawCard(ctx, travel, top, language) + MARGIN;
  });

  return canvas.toBuffer('image/png');
}
