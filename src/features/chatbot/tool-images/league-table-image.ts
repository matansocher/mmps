import type { CanvasRenderingContext2D } from 'canvas';
import type { CompetitionTableToolRow } from '@shared/ai/tools';
import { COLORS, createScaledCanvas, drawText, font, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';

export type LeagueTableImageInput = {
  readonly competition: string;
  readonly rows: readonly CompetitionTableToolRow[];
  readonly highlightedPositions: readonly number[];
  readonly language: ImageLanguage;
};

type Column = {
  readonly key: 'played' | 'won' | 'drawn' | 'lost' | 'goalDifference' | 'points';
  readonly center: number; // Distance from the end edge (right edge in LTR)
};

const WIDTH = 480;
const PADDING = 16;
const HEADER_HEIGHT = 62;
const COLUMN_HEADER_HEIGHT = 26;
const LEGEND_ITEM_HEIGHT = 20;
const ZONE_STRIP_WIDTH = 4;
const POSITION_CENTER = PADDING + 22;
const TEAM_START = PADDING + 42;
const TEAM_END_MARGIN = 236;

const COLUMNS: readonly Column[] = [
  { key: 'played', center: 216 },
  { key: 'won', center: 184 },
  { key: 'drawn', center: 154 },
  { key: 'lost', center: 124 },
  { key: 'goalDifference', center: 88 },
  { key: 'points', center: 40 },
];

const FALLBACK_TOP_COLOR = COLORS.successText;
const FALLBACK_BOTTOM_COLOR = COLORS.dangerText;
const FALLBACK_BOTTOM_COUNT = 3;
const FALLBACK_MIN_ROWS = 8;

const LABELS: Record<ImageLanguage, { readonly subtitle: string; readonly columns: Record<Column['key'], string> }> = {
  he: { subtitle: 'טבלת הליגה', columns: { played: 'מש׳', won: 'נ׳', drawn: 'ת׳', lost: 'ה׳', goalDifference: 'הפרש', points: 'נק׳' } },
  en: { subtitle: 'League table', columns: { played: 'P', won: 'W', drawn: 'D', lost: 'L', goalDifference: 'GD', points: 'Pts' } },
};

// Uses the API zones when present, otherwise highlights the leader and the bottom of the table.
export function getZoneColors(rows: readonly CompetitionTableToolRow[]): (string | undefined)[] {
  if (rows.some((row) => row.zoneColor)) {
    return rows.map((row) => row.zoneColor);
  }
  if (rows.length < FALLBACK_MIN_ROWS) {
    return rows.map((_, index) => (index === 0 ? FALLBACK_TOP_COLOR : undefined));
  }
  return rows.map((_, index) => (index === 0 ? FALLBACK_TOP_COLOR : index >= rows.length - FALLBACK_BOTTOM_COUNT ? FALLBACK_BOTTOM_COLOR : undefined));
}

function getLegend(rows: readonly CompetitionTableToolRow[]): { readonly name: string; readonly color: string }[] {
  const legend = new Map<string, string>();
  rows.filter((row) => row.zone && row.zoneColor).forEach((row) => legend.set(row.zone, row.zoneColor));
  return [...legend].map(([name, color]) => ({ name, color }));
}

function formatValue(row: CompetitionTableToolRow, key: Column['key']): string {
  const value = row[key];
  if (value == null) return '-';
  return key === 'goalDifference' && value > 0 ? `+${value}` : `${value}`;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated.trimEnd()}...`;
}

function drawCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function generateLeagueTableImage({ competition, rows, highlightedPositions, language }: LeagueTableImageInput): Buffer {
  const rtl = language === 'he';
  const labels = LABELS[language];
  const rowHeight = rows.length > 24 ? 26 : 30;
  const legend = getLegend(rows);
  const legendHeight = legend.length ? PADDING / 2 + legend.length * LEGEND_ITEM_HEIGHT : 0;
  const tableTop = HEADER_HEIGHT + COLUMN_HEADER_HEIGHT;
  const height = tableTop + rows.length * rowHeight + legendHeight + PADDING;

  const { canvas, ctx } = createScaledCanvas(WIDTH, height);
  // Mirrors a start-edge offset (left in LTR) into an absolute x coordinate.
  const fromStart = (offset: number) => (rtl ? WIDTH - offset : offset);
  const fromEnd = (offset: number) => (rtl ? offset : WIDTH - offset);
  const startAlign = rtl ? 'right' : 'left';

  ctx.font = font(20);
  drawText(ctx, truncate(ctx, competition, WIDTH - PADDING * 2), fromStart(PADDING), 26, 20, COLORS.text, startAlign);
  drawText(ctx, labels.subtitle, fromStart(PADDING), 48, 13, COLORS.muted, startAlign);

  const columnHeaderY = HEADER_HEIGHT + COLUMN_HEADER_HEIGHT / 2;
  drawCentered(ctx, '#', fromStart(POSITION_CENTER), columnHeaderY, 12, COLORS.muted);
  COLUMNS.forEach(({ key, center }) => drawCentered(ctx, labels.columns[key], fromEnd(center), columnHeaderY, 12, COLORS.muted));
  ctx.fillStyle = COLORS.cardBorder;
  ctx.fillRect(PADDING, tableTop - 1, WIDTH - PADDING * 2, 1);

  const zoneColors = getZoneColors(rows);
  rows.forEach((row, index) => {
    const top = tableTop + index * rowHeight;
    const centerY = top + rowHeight / 2;
    const highlighted = highlightedPositions.includes(row.position);

    if (highlighted) {
      ctx.fillStyle = COLORS.infoBg;
      roundRect(ctx, PADDING, top + 1, WIDTH - PADDING * 2, rowHeight - 2, 6);
      ctx.fill();
    } else if (index % 2 === 1) {
      ctx.fillStyle = COLORS.card;
      ctx.fillRect(PADDING, top, WIDTH - PADDING * 2, rowHeight);
    }

    const zoneColor = zoneColors[index];
    if (zoneColor) {
      ctx.fillStyle = zoneColor;
      roundRect(ctx, rtl ? WIDTH - PADDING - ZONE_STRIP_WIDTH : PADDING, top + 4, ZONE_STRIP_WIDTH, rowHeight - 8, 2);
      ctx.fill();
    }

    const textColor = highlighted ? COLORS.infoText : COLORS.text;
    drawCentered(ctx, `${row.position}`, fromStart(POSITION_CENTER), centerY, 13, highlighted ? COLORS.infoText : COLORS.muted);
    ctx.font = font(14);
    drawText(ctx, truncate(ctx, row.team, WIDTH - TEAM_START - TEAM_END_MARGIN), fromStart(TEAM_START), centerY, 14, textColor, startAlign);
    COLUMNS.forEach(({ key, center }) => {
      const isPoints = key === 'points';
      drawCentered(ctx, formatValue(row, key), fromEnd(center), centerY, isPoints ? 15 : 13, isPoints || highlighted ? textColor : COLORS.muted);
    });
  });

  let legendY = tableTop + rows.length * rowHeight + PADDING / 2 + LEGEND_ITEM_HEIGHT / 2;
  legend.forEach(({ name, color }) => {
    ctx.fillStyle = color;
    roundRect(ctx, rtl ? WIDTH - PADDING - 12 : PADDING, legendY - 5, 12, 10, 3);
    ctx.fill();
    drawText(ctx, name, fromStart(PADDING + 20), legendY, 12, COLORS.muted, startAlign);
    legendY += LEGEND_ITEM_HEIGHT;
  });

  return canvas.toBuffer('image/png');
}
