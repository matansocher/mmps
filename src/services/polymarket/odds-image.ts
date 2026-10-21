import type { CanvasRenderingContext2D } from 'canvas';
import { COLORS as BASE_COLORS, createScaledCanvas, drawBadge, drawText, font, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';

export type OddsRowTone = 'yes' | 'no';

export type OddsRow = {
  readonly label: string;
  readonly probability: number; // 0..1
  readonly change: number | null; // Absolute change, 0..1 scale (e.g. 0.02 = +2 points)
  readonly tone?: OddsRowTone;
};

export type OddsCard = {
  readonly title: string;
  readonly rows: readonly OddsRow[];
};

export type OddsImageOptions = {
  readonly subtitle?: string;
  readonly language?: ImageLanguage;
};

const WIDTH = 640;
const MARGIN = 16;
const PADDING = 20;
const HEADER_HEIGHT = 64;
const TITLE_SIZE = 18;
const TITLE_LINE_HEIGHT = 24;
const LABEL_SIZE = 15;
const LABEL_LINE_HEIGHT = 20;
const BAR_HEIGHT = 12;
const BAR_ROW_HEIGHT = 24;
const ROW_GAP = 12;
const PERCENT_WIDTH = 64;
const CHANGE_WIDTH = 78;
const MAX_TITLE_LINES = 2;
const MAX_LABEL_LINES = 2;
const MIN_CHANGE = 0.0005;

const COLORS = {
  ...BASE_COLORS,
  leader: BASE_COLORS.primary,
  bar: '#9cc3f5',
  track: '#e6ebf2',
  yes: '#27ae60',
  no: '#e5534b',
  neutralBg: '#eceff3',
} as const;

const BRAND = 'Polymarket';

function wrapText(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number, maxLines: number): string[] {
  ctx.font = font(size);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) {
    return lines.map((line) => ellipsize(ctx, line, maxWidth));
  }
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]} ${lines[maxLines]}`, maxWidth, true);
  return kept;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, force = false): string {
  if (!force && ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

export function formatPercent(probability: number): string {
  const pct = probability * 100;
  if (pct > 0 && pct < 1) return '<1%';
  if (pct < 100 && pct > 99) return '>99%';
  return `${pct.toFixed(pct >= 10 ? 0 : 1)}%`;
}

export function formatChange(change: number): string {
  const points = change * 100;
  if (Math.abs(change) < MIN_CHANGE) return '0.0';
  return `${points > 0 ? '+' : '-'}${Math.abs(points).toFixed(1)}`;
}

type LaidOutCard = {
  readonly card: OddsCard;
  readonly titleLines: readonly string[];
  readonly labelLines: readonly (readonly string[])[];
  readonly height: number;
};

function layoutCard(ctx: CanvasRenderingContext2D, card: OddsCard): LaidOutCard {
  const innerWidth = WIDTH - MARGIN * 2 - PADDING * 2;
  const titleLines = wrapText(ctx, card.title, TITLE_SIZE, innerWidth, MAX_TITLE_LINES);
  const labelLines = card.rows.map((row) => wrapText(ctx, row.label, LABEL_SIZE, innerWidth, MAX_LABEL_LINES));
  const rowsHeight = labelLines.reduce((sum, lines) => sum + lines.length * LABEL_LINE_HEIGHT + BAR_ROW_HEIGHT + ROW_GAP, 0);
  const height = PADDING * 2 + titleLines.length * TITLE_LINE_HEIGHT + 10 + rowsHeight - ROW_GAP;
  return { card, titleLines, labelLines, height };
}

function barColor(row: OddsRow, isLeader: boolean): string {
  if (row.tone === 'yes') return COLORS.yes;
  if (row.tone === 'no') return COLORS.no;
  return isLeader ? COLORS.leader : COLORS.bar;
}

function drawCard(ctx: CanvasRenderingContext2D, { card, titleLines, labelLines, height }: LaidOutCard, top: number, rtl: boolean): void {
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
  const dir = rtl ? -1 : 1;

  let y = top + PADDING;
  titleLines.forEach((line) => {
    drawText(ctx, line, start, y + TITLE_LINE_HEIGHT / 2, TITLE_SIZE, COLORS.text, align);
    y += TITLE_LINE_HEIGHT;
  });
  y += 10;

  const maxProbability = Math.max(...card.rows.map((row) => row.probability));
  const hasChanges = card.rows.some((row) => row.change !== null);
  const trackStart = start;
  const trackEnd = end - dir * (PERCENT_WIDTH + (hasChanges ? CHANGE_WIDTH : 0));
  const trackWidth = Math.abs(trackEnd - trackStart);

  card.rows.forEach((row, index) => {
    labelLines[index].forEach((line) => {
      drawText(ctx, line, start, y + LABEL_LINE_HEIGHT / 2, LABEL_SIZE, COLORS.text, align);
      y += LABEL_LINE_HEIGHT;
    });

    const barCenter = y + BAR_ROW_HEIGHT / 2;
    const barTop = barCenter - BAR_HEIGHT / 2;
    const trackLeft = Math.min(trackStart, trackEnd);
    ctx.fillStyle = COLORS.track;
    roundRect(ctx, trackLeft, barTop, trackWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    ctx.fill();

    const fillWidth = Math.max(BAR_HEIGHT, trackWidth * Math.min(1, Math.max(0, row.probability)));
    ctx.fillStyle = barColor(row, row.probability === maxProbability);
    roundRect(ctx, rtl ? trackStart - fillWidth : trackStart, barTop, fillWidth, BAR_HEIGHT, BAR_HEIGHT / 2);
    ctx.fill();

    const percentX = trackEnd + dir * 10;
    drawText(ctx, formatPercent(row.probability), percentX, barCenter, 17, COLORS.text, align);

    if (row.change !== null) {
      const up = row.change >= MIN_CHANGE;
      const down = row.change <= -MIN_CHANGE;
      const bg = up ? COLORS.successBg : down ? COLORS.dangerBg : COLORS.neutralBg;
      const color = up ? COLORS.successText : down ? COLORS.dangerText : COLORS.muted;
      ctx.font = font(13);
      const badgeWidth = ctx.measureText(formatChange(row.change)).width + 16;
      const badgeEdge = rtl ? end + badgeWidth : end - badgeWidth;
      drawBadge(ctx, formatChange(row.change), badgeEdge, barCenter, bg, color, rtl);
    }

    y += BAR_ROW_HEIGHT + ROW_GAP;
  });
}

function drawHeader(ctx: CanvasRenderingContext2D, language: ImageLanguage, subtitle: string | undefined): void {
  const rtl = language === 'he';
  const start = rtl ? WIDTH - MARGIN - 4 : MARGIN + 4;
  const align = rtl ? 'right' : 'left';
  const dir = rtl ? -1 : 1;

  // Simple bar-chart logo drawn with shapes (the bundled font has no emoji)
  const logoX = rtl ? start - 26 : start;
  const bars = [10, 18, 26];
  bars.forEach((h, i) => {
    ctx.fillStyle = i === bars.length - 1 ? COLORS.leader : COLORS.bar;
    roundRect(ctx, logoX + i * 9, 44 - h, 7, h, 2);
    ctx.fill();
  });

  const textStart = start + dir * 36;
  const afterBrand = drawText(ctx, BRAND, textStart, 31, 22, COLORS.text, align);
  if (subtitle) {
    drawText(ctx, subtitle, afterBrand + dir * 12, 32, 15, COLORS.muted, align);
  }
}

// Renders one card per market/event with a probability bar per outcome and the change badge when known.
export function generateOddsImage(cards: readonly OddsCard[], { subtitle, language = 'en' }: OddsImageOptions = {}): Buffer {
  const nonEmpty = cards.filter((card) => card.rows.length);
  if (!nonEmpty.length) {
    throw new Error('Cannot render an odds image without outcomes');
  }

  const measure = createScaledCanvas(1, 1).ctx;
  const laidOut = nonEmpty.map((card) => layoutCard(measure, card));
  const totalHeight = HEADER_HEIGHT + laidOut.reduce((sum, card) => sum + card.height + MARGIN, 0);

  const { canvas, ctx } = createScaledCanvas(WIDTH, totalHeight, COLORS.background);
  drawHeader(ctx, language, subtitle);

  let top = HEADER_HEIGHT;
  laidOut.forEach((card) => {
    drawCard(ctx, card, top, language === 'he');
    top += card.height + MARGIN;
  });

  return canvas.toBuffer('image/png');
}
