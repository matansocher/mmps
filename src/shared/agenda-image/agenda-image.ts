import type { CanvasRenderingContext2D } from 'canvas';
import { addDays, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { COLORS as BASE_COLORS, createScaledCanvas, drawText, font, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';
import { buildAgendaDays, MAX_AGENDA_DAYS, MIN_VISUAL_MINUTES } from './layout';
import type { AgendaBlock, AgendaDay, AgendaEvent, AgendaImageOptions } from './types';

type Labels = {
  readonly today: string;
  readonly tomorrow: string;
  readonly weekdays: readonly string[];
  readonly events: (n: number) => string;
  readonly allDay: string;
  readonly moreDays: (n: number) => string;
};

type Palette = { readonly bg: string; readonly bar: string; readonly text: string };

const WIDTH = 640;
const MARGIN = 16;
const PADDING = 20;
const HEADER_HEIGHT = 62;
const ALL_DAY_ROW = 30;
const TIME_COLUMN = 50;
const TIMELINE_GAP = 10;
const PX_PER_HOUR = { single: 46, multi: 34 } as const;
const MIN_HOURS = 2;
const FOOTER_HEIGHT = 30;

const COLORS = {
  background: BASE_COLORS.background,
  card: BASE_COLORS.card,
  cardBorder: BASE_COLORS.cardBorder,
  text: BASE_COLORS.text,
  muted: BASE_COLORS.muted,
  allDayBg: BASE_COLORS.primary,
  allDayText: '#ffffff',
  grid: BASE_COLORS.cardBorder,
} as const;

const PALETTES: readonly Palette[] = [
  { bg: BASE_COLORS.infoBg, bar: BASE_COLORS.primary, text: BASE_COLORS.infoText },
  { bg: BASE_COLORS.warningBg, bar: BASE_COLORS.accent, text: BASE_COLORS.warningText },
  { bg: BASE_COLORS.successBg, bar: '#27ae60', text: BASE_COLORS.successText },
  { bg: '#eee7fb', bar: '#8e5ad8', text: '#5b32a3' },
];

const LABELS: Record<ImageLanguage, Labels> = {
  he: {
    today: 'היום',
    tomorrow: 'מחר',
    weekdays: ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'],
    events: (n) => (n === 1 ? 'אירוע אחד' : `${n} אירועים`),
    allDay: 'כל היום',
    moreDays: (n) => (n === 1 ? 'ועוד יום אחד עם אירועים' : `ועוד ${n} ימים עם אירועים`),
  },
  en: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    events: (n) => (n === 1 ? '1 event' : `${n} events`),
    allDay: 'All day',
    moreDays: (n) => (n === 1 ? '+1 more day with events' : `+${n} more days with events`),
  },
};

function hourRange(day: AgendaDay): { readonly from: number; readonly to: number } | null {
  if (!day.blocks.length) return null;
  const from = Math.floor(Math.min(...day.blocks.map((block) => block.startMinute)) / 60);
  const lastEnd = Math.max(...day.blocks.map((block) => Math.max(block.endMinute, block.startMinute + MIN_VISUAL_MINUTES)));
  const to = Math.min(24, Math.max(Math.ceil(lastEnd / 60), from + MIN_HOURS));
  return { from: Math.max(0, Math.min(from, to - MIN_HOURS)), to };
}

function dayHeight(day: AgendaDay, pxPerHour: number): number {
  const range = hourRange(day);
  const timeline = range ? (range.to - range.from) * pxPerHour + 12 : 0;
  return PADDING * 2 + HEADER_HEIGHT + day.allDay.length * ALL_DAY_ROW + (day.allDay.length && range ? 8 : 0) + timeline;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number): string {
  ctx.font = font(size);
  const clean = text.replace(/\s+/g, ' ').trim();
  if (ctx.measureText(clean).width <= maxWidth) return clean;
  let result = clean;
  while (result.length > 1 && ctx.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}...`;
}

function formatTime(iso: string): string {
  return format(toZonedTime(new Date(iso), DEFAULT_TIMEZONE), 'HH:mm');
}

function dayTitle(date: string, now: Date, labels: Labels): { readonly title: string; readonly subtitle: string } {
  const today = format(toZonedTime(now, DEFAULT_TIMEZONE), 'yyyy-MM-dd');
  const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd');
  const parsed = parseISO(date);
  const weekday = labels.weekdays[parsed.getDay()];
  const shortDate = format(parsed, 'dd.MM');
  if (date === today || date === tomorrow) {
    return { title: date === today ? labels.today : labels.tomorrow, subtitle: `${weekday}  ·  ${shortDate}` };
  }
  return { title: weekday, subtitle: shortDate };
}

function blockTime({ event, startMinute, endMinute }: AgendaBlock): string {
  const clock = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  const start = event.start && startMinute > 0 ? formatTime(event.start) : clock(startMinute);
  if (endMinute <= startMinute) return start;
  return `${start}-${clock(endMinute)}`;
}

function drawCard(ctx: CanvasRenderingContext2D, day: AgendaDay, top: number, pxPerHour: number, language: ImageLanguage, now: Date): number {
  const rtl = language === 'he';
  const labels = LABELS[language];
  const height = dayHeight(day, pxPerHour);
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
  const innerWidth = right - left - PADDING * 2;

  const { title, subtitle } = dayTitle(day.date, now, labels);
  const titleY = top + PADDING + 16;
  drawText(ctx, title, start, titleY, 26, COLORS.text, align);
  drawText(ctx, labels.events(day.allDay.length + new Set(day.blocks.map((block) => block.event)).size), end, titleY, 15, COLORS.muted, oppositeAlign);
  drawText(ctx, subtitle, start, titleY + 30, 15, COLORS.muted, align);

  let y = top + PADDING + HEADER_HEIGHT;

  day.allDay.forEach((event) => {
    const rowHeight = ALL_DAY_ROW - 6;
    ctx.fillStyle = COLORS.allDayBg;
    roundRect(ctx, left + PADDING, y, innerWidth, rowHeight, rowHeight / 2);
    ctx.fill();
    const labelEdge = drawText(ctx, labels.allDay, start + dir * 12, y + rowHeight / 2, 12, '#d6e6fc', align);
    const available = innerWidth - Math.abs(labelEdge - start) - 36;
    drawText(ctx, truncate(ctx, event.title, 14, available), labelEdge + dir * 10, y + rowHeight / 2, 14, COLORS.allDayText, align);
    y += ALL_DAY_ROW;
  });

  const range = hourRange(day);
  if (!range) return height;
  if (day.allDay.length) y += 8;

  const timelineTop = y + 6;
  const gridStart = start + dir * TIME_COLUMN;
  const areaStart = gridStart + dir * TIMELINE_GAP;
  const areaWidth = innerWidth - TIME_COLUMN - TIMELINE_GAP;

  for (let hour = range.from; hour <= range.to; hour++) {
    const lineY = timelineTop + (hour - range.from) * pxPerHour;
    drawText(ctx, `${String(hour % 24).padStart(2, '0')}:00`, start, lineY, 12, COLORS.muted, align);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gridStart, lineY);
    ctx.lineTo(end, lineY);
    ctx.stroke();
  }

  const palettes = new Map<AgendaEvent, Palette>();
  day.blocks.forEach((block) => {
    if (!palettes.has(block.event)) palettes.set(block.event, PALETTES[palettes.size % PALETTES.length]);
    const palette = palettes.get(block.event);
    const columnWidth = areaWidth / block.columns;
    const blockWidth = columnWidth - 4;
    const blockStart = areaStart + dir * block.column * columnWidth;
    const x = rtl ? blockStart - blockWidth : blockStart;
    const blockTop = timelineTop + ((block.startMinute - range.from * 60) / 60) * pxPerHour + 1;
    const duration = Math.max(block.endMinute - block.startMinute, MIN_VISUAL_MINUTES);
    const blockHeight = (duration / 60) * pxPerHour - 2;

    ctx.fillStyle = palette.bg;
    roundRect(ctx, x, blockTop, blockWidth, blockHeight, 8);
    ctx.fill();
    ctx.fillStyle = palette.bar;
    roundRect(ctx, rtl ? x + blockWidth - 4 : x, blockTop, 4, blockHeight, 2);
    ctx.fill();

    const textX = blockStart + dir * 12;
    const textWidth = blockWidth - 20;
    const time = blockTime(block);
    if (blockHeight >= 40) {
      drawText(ctx, truncate(ctx, block.event.title, 14, textWidth), textX, blockTop + 13, 14, COLORS.text, align);
      const details = [time, block.event.location].filter(Boolean).join('  ·  ');
      drawText(ctx, truncate(ctx, details, 12, textWidth), textX, blockTop + 31, 12, palette.text, align);
    } else {
      const afterTime = drawText(ctx, time, textX, blockTop + blockHeight / 2, 12, palette.text, align);
      const titleWidth = textWidth - Math.abs(afterTime - textX) - 8;
      if (titleWidth > 24) {
        drawText(ctx, truncate(ctx, block.event.title, 13, titleWidth), afterTime + dir * 8, blockTop + blockHeight / 2, 13, COLORS.text, align);
      }
    }
  });

  return height;
}

// Renders a day-by-day agenda timeline (all-day events on top, timed events sized by duration, overlaps side by side) as a PNG.
export function generateAgendaImage(events: readonly AgendaEvent[], { language = 'en', days, now = new Date() }: AgendaImageOptions = {}): Buffer | null {
  const allDays = buildAgendaDays(events, days).filter((day) => day.allDay.length || day.blocks.length);
  if (!allDays.length) return null;

  const shown = allDays.slice(0, MAX_AGENDA_DAYS);
  const hidden = allDays.length - shown.length;
  const pxPerHour = shown.length > 1 ? PX_PER_HOUR.multi : PX_PER_HOUR.single;
  const heights = shown.map((day) => dayHeight(day, pxPerHour));
  const totalHeight = MARGIN + heights.reduce((sum, h) => sum + h + MARGIN, 0) + (hidden ? FOOTER_HEIGHT : 0);

  const { canvas, ctx } = createScaledCanvas(WIDTH, totalHeight, COLORS.background);

  let top = MARGIN;
  shown.forEach((day) => {
    top += drawCard(ctx, day, top, pxPerHour, language, now) + MARGIN;
  });
  if (hidden) {
    const rtl = language === 'he';
    drawText(ctx, LABELS[language].moreDays(hidden), rtl ? WIDTH - MARGIN - 8 : MARGIN + 8, top + FOOTER_HEIGHT / 2 - 8, 15, COLORS.muted, rtl ? 'right' : 'left');
  }

  return canvas.toBuffer('image/png');
}
