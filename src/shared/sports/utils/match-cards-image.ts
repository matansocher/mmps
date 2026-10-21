import type { CanvasRenderingContext2D, Image } from 'canvas';
import { COLORS, createScaledCanvas, drawText, font, roundRect } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';
import type { MatchCard, MatchCardGroup } from './match-cards';
import { loadLogos } from './sports-logos';

export type MatchCardSection = {
  readonly competition: string;
  readonly competitionId?: number;
  readonly date: string;
  readonly matches: MatchCard[];
};

type MatchCardSections = {
  readonly sections: MatchCardSection[];
  readonly hiddenCount: number;
};

type Labels = {
  readonly weekdays: readonly string[];
  readonly date: (weekday: string, day: string, month: string) => string;
  readonly live: string;
  readonly finished: string;
  readonly more: (n: number) => string;
};

// Keeps the image within Telegram's photo dimension limits (width + height <= 10000 at IMAGE_SCALE).
export const MAX_MATCHES_IN_IMAGE = 40;

const WIDTH = 640;
const MARGIN = 16;
const INNER_PADDING = 16;
const SECTION_HEADER_HEIGHT = 40;
const SECTION_GAP = 14;
const ROW_HEIGHT = 60;
const FOOTER_HEIGHT = 34;
const CENTER_WIDTH = 120;
const TEAM_GAP = 10;
const SCORE_OFFSET = 20;
const LOGO_SIZE = 26;
const LOGO_GAP = 8;
const COMPETITION_LOGO_SIZE = 22;

type TeamLogos = ReadonlyMap<number, Image>;

const LABELS: Record<ImageLanguage, Labels> = {
  he: {
    weekdays: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
    date: (weekday, day, month) => `יום ${weekday} ${day}.${month}`,
    live: 'חי',
    finished: 'הסתיים',
    more: (n) => `ועוד ${n} משחקים`,
  },
  en: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    date: (weekday, day, month) => `${weekday} ${day}.${month}`,
    live: 'LIVE',
    finished: 'FT',
    more: (n) => `+${n} more matches`,
  },
};

// Splits each competition into one section per match date and caps the total number of matches.
export function toMatchCardSections(groups: readonly MatchCardGroup[], maxMatches = MAX_MATCHES_IN_IMAGE): MatchCardSections {
  const sections: MatchCardSection[] = [];
  let remaining = maxMatches;
  let hiddenCount = 0;
  for (const group of groups) {
    const byDate = new Map<string, MatchCard[]>();
    for (const match of group.matches) {
      if (remaining <= 0) {
        hiddenCount++;
        continue;
      }
      remaining--;
      byDate.set(match.date, [...(byDate.get(match.date) ?? []), match]);
    }
    for (const [date, matches] of byDate) {
      sections.push({ competition: group.competition, competitionId: group.competitionId, date, matches });
    }
  }
  return { sections, hiddenCount };
}

function formatDateLabel(date: string, labels: Labels): string {
  const [, month, day] = date.split('-');
  const weekday = labels.weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return labels.date(weekday, day, month);
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number): string {
  ctx.font = font(size);
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}...`;
}

function drawCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawLiveStatus(ctx: CanvasRenderingContext2D, text: string, centerX: number, y: number): void {
  ctx.font = font(13);
  const dotRadius = 4;
  const gap = 6;
  const width = dotRadius * 2 + gap + ctx.measureText(text).width;
  const startX = centerX - width / 2;
  ctx.beginPath();
  ctx.arc(startX + dotRadius, y, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.dangerText;
  ctx.fill();
  drawText(ctx, text, startX + dotRadius * 2 + gap, y, 13, COLORS.dangerText, 'left');
}

function teamColor(match: MatchCard, side: 'home' | 'away'): string {
  if (match.status !== 'finished' || match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore) {
    return COLORS.text;
  }
  const homeWon = match.homeScore > match.awayScore;
  return (side === 'home') === homeWon ? COLORS.text : COLORS.muted;
}

// Fits the logo inside a size x size box, keeping its aspect ratio.
function drawLogo(ctx: CanvasRenderingContext2D, logo: Image, centerX: number, centerY: number, size = LOGO_SIZE): void {
  const scale = Math.min(size / logo.width, size / logo.height);
  const width = logo.width * scale;
  const height = logo.height * scale;
  ctx.drawImage(logo, centerX - width / 2, centerY - height / 2, width, height);
}

function drawMatchRow(ctx: CanvasRenderingContext2D, match: MatchCard, top: number, labels: Labels, rtl: boolean, logos: TeamLogos | null): void {
  const cardLeft = MARGIN;
  const cardRight = WIDTH - MARGIN;
  const centerX = WIDTH / 2;
  const dir = rtl ? -1 : 1;
  const logoSpace = logos ? LOGO_SIZE + LOGO_GAP : 0;
  const teamWidth = (cardRight - cardLeft - INNER_PADDING * 2 - CENTER_WIDTH) / 2 - TEAM_GAP - logoSpace;
  const middleY = top + ROW_HEIGHT / 2;

  // Home sits on the reading-start side, both team names hug the center column with their logos in between.
  const homeEdge = centerX - dir * (CENTER_WIDTH / 2 + TEAM_GAP + logoSpace);
  const awayEdge = centerX + dir * (CENTER_WIDTH / 2 + TEAM_GAP + logoSpace);
  if (logos) {
    const logoOffset = CENTER_WIDTH / 2 + TEAM_GAP + LOGO_SIZE / 2;
    const homeLogo = logos.get(match.homeId);
    const awayLogo = logos.get(match.awayId);
    if (homeLogo) drawLogo(ctx, homeLogo, centerX - dir * logoOffset, middleY);
    if (awayLogo) drawLogo(ctx, awayLogo, centerX + dir * logoOffset, middleY);
  }
  drawText(ctx, ellipsize(ctx, match.home, 16, teamWidth), homeEdge, middleY, 16, teamColor(match, 'home'), rtl ? 'left' : 'right');
  drawText(ctx, ellipsize(ctx, match.away, 16, teamWidth), awayEdge, middleY, 16, teamColor(match, 'away'), rtl ? 'right' : 'left');

  const subline = match.status === 'live' ? (match.minute ? `${match.minute}'` : labels.live) : match.status === 'finished' ? labels.finished : match.channel;
  const mainY = subline ? top + 23 : middleY;
  const sublineY = top + 45;

  if (match.homeScore !== null && match.awayScore !== null) {
    const scoreColor = match.status === 'live' ? COLORS.dangerText : COLORS.text;
    drawCenteredText(ctx, String(match.homeScore), centerX - dir * SCORE_OFFSET, mainY, 22, scoreColor);
    drawCenteredText(ctx, String(match.awayScore), centerX + dir * SCORE_OFFSET, mainY, 22, scoreColor);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX - 5, mainY);
    ctx.lineTo(centerX + 5, mainY);
    ctx.stroke();
  } else {
    const timeColor = match.status === 'live' ? COLORS.dangerText : COLORS.primary;
    drawCenteredText(ctx, match.time, centerX, mainY, 20, timeColor);
  }

  if (!subline) return;
  if (match.status === 'live') {
    drawLiveStatus(ctx, subline, centerX, sublineY);
  } else {
    drawCenteredText(ctx, ellipsize(ctx, subline, 12, CENTER_WIDTH + TEAM_GAP), centerX, sublineY, 12, COLORS.muted);
  }
}

function drawSection(ctx: CanvasRenderingContext2D, section: MatchCardSection, top: number, labels: Labels, rtl: boolean, logos: TeamLogos | null, competitionLogo: Image | null): number {
  const dir = rtl ? -1 : 1;
  const titleEdge = rtl ? WIDTH - MARGIN - 4 : MARGIN + 4;
  const competitionLogoSpace = competitionLogo ? COMPETITION_LOGO_SIZE + LOGO_GAP : 0;
  const start = titleEdge + dir * competitionLogoSpace;
  const end = rtl ? MARGIN + 4 : WIDTH - MARGIN - 4;
  const headerY = top + SECTION_HEADER_HEIGHT / 2;
  const dateLabel = formatDateLabel(section.date, labels);
  ctx.font = font(13);
  const dateWidth = ctx.measureText(dateLabel).width;
  const titleWidth = WIDTH - MARGIN * 2 - dateWidth - 24 - competitionLogoSpace;
  if (competitionLogo) {
    drawLogo(ctx, competitionLogo, titleEdge + (dir * COMPETITION_LOGO_SIZE) / 2, headerY, COMPETITION_LOGO_SIZE);
  }
  drawText(ctx, ellipsize(ctx, section.competition, 18, titleWidth), start, headerY, 18, COLORS.text, rtl ? 'right' : 'left');
  drawText(ctx, dateLabel, end, headerY, 13, COLORS.muted, rtl ? 'left' : 'right');

  const cardTop = top + SECTION_HEADER_HEIGHT;
  const cardHeight = section.matches.length * ROW_HEIGHT;
  ctx.fillStyle = COLORS.card;
  roundRect(ctx, MARGIN, cardTop, WIDTH - MARGIN * 2, cardHeight, 16);
  ctx.fill();
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  section.matches.forEach((match, index) => {
    const rowTop = cardTop + index * ROW_HEIGHT;
    if (index > 0) {
      ctx.strokeStyle = COLORS.cardBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN + INNER_PADDING, rowTop);
      ctx.lineTo(WIDTH - MARGIN - INNER_PADDING, rowTop);
      ctx.stroke();
    }
    drawMatchRow(ctx, match, rowTop, labels, rtl, logos);
  });

  return SECTION_HEADER_HEIGHT + cardHeight;
}

export async function generateMatchCardsImage(groups: readonly MatchCardGroup[], language: ImageLanguage = 'he'): Promise<Buffer | null> {
  const { sections, hiddenCount } = toMatchCardSections(groups);
  if (!sections.length) {
    return null;
  }

  const teamIds = sections.flatMap((section) => section.matches.flatMap((match) => [match.homeId, match.awayId])).filter(Boolean);
  const competitionIds = sections.map((section) => section.competitionId).filter(Boolean);
  const [loadedLogos, competitionLogos] = await Promise.all([loadLogos('team', teamIds), loadLogos('competition', competitionIds)]);
  // Space for logos is reserved only when at least one loaded, so a logo outage falls back to the plain layout.
  const logos = loadedLogos.size ? loadedLogos : null;

  const labels = LABELS[language];
  const rtl = language === 'he';
  const sectionsHeight = sections.reduce((sum, section) => sum + SECTION_HEADER_HEIGHT + section.matches.length * ROW_HEIGHT, 0) + SECTION_GAP * (sections.length - 1);
  const totalHeight = MARGIN + sectionsHeight + (hiddenCount ? FOOTER_HEIGHT : 0) + MARGIN;
  const { canvas, ctx } = createScaledCanvas(WIDTH, totalHeight, COLORS.background);

  let top = MARGIN - 4;
  for (const section of sections) {
    top += drawSection(ctx, section, top, labels, rtl, logos, competitionLogos.get(section.competitionId) ?? null) + SECTION_GAP;
  }
  if (hiddenCount) {
    drawCenteredText(ctx, labels.more(hiddenCount), WIDTH / 2, top - SECTION_GAP + FOOTER_HEIGHT / 2 + 4, 13, COLORS.muted);
  }

  return canvas.toBuffer('image/png');
}
