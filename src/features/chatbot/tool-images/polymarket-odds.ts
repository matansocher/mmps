import { generateOddsImage } from '@services/polymarket';
import type { OddsCard, OddsRow } from '@services/polymarket';
import { detectLanguage } from '@shared/image-card';
import type { ImageLanguage } from '@shared/image-card';
import type { ToolResult } from '../types';
import type { ToolImageBuilder } from './types';

const POLYMARKET_TOOL_NAME = 'polymarket';
const MAX_ROWS = 8;

export type PolymarketOddsKind = 'event' | 'trending' | 'subscribed';

export type PolymarketOddsSelection = {
  readonly kind: PolymarketOddsKind;
  readonly card: OddsCard;
};

const SUBTITLES: Record<ImageLanguage, Record<PolymarketOddsKind, string>> = {
  he: { event: 'סיכויים', trending: 'שווקים חמים', subscribed: 'מעקב חדש' },
  en: { event: 'Odds', trending: 'Trending', subscribed: 'Now following' },
};

// Accepts 0..1 numbers or percent strings like "45.0%" / "45.0% Yes".
export function parseProbability(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) / 100 : null;
}

function toChange(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function binaryRows(probability: number, change: number | null): OddsRow[] {
  return [
    { label: 'Yes', probability, change, tone: 'yes' },
    { label: 'No', probability: 1 - probability, change: change === null ? null : -change, tone: 'no' },
  ];
}

type ToolOutcome = { readonly outcome?: string; readonly probability?: unknown; readonly oneDayPriceChange?: unknown };
type ToolMarket = { readonly question?: string; readonly yesPrice?: unknown; readonly oneDayPriceChange?: unknown };
type ToolSubscribedMarket = { readonly question?: string; readonly currentPrice?: unknown; readonly topOutcomes?: unknown[] };
type PolymarketToolData = {
  readonly success?: boolean;
  readonly event?: { readonly title?: string };
  readonly outcomes?: ToolOutcome[];
  readonly markets?: ToolMarket[];
  readonly market?: ToolSubscribedMarket;
};

function selectFromData(data: PolymarketToolData | null): PolymarketOddsSelection | null {
  if (!data?.success) return null;

  if (Array.isArray(data.outcomes) && data.outcomes.length) {
    const rows = data.outcomes
      .map((outcome) => ({ label: String(outcome.outcome ?? ''), probability: parseProbability(outcome.probability), change: toChange(outcome.oneDayPriceChange) }))
      .filter((row) => row.label && row.probability !== null)
      .slice(0, MAX_ROWS);
    return rows.length ? { kind: 'event', card: { title: data.event?.title ?? '', rows } } : null;
  }

  if (Array.isArray(data.markets) && data.markets.length) {
    const markets = data.markets.filter((market) => market?.question && parseProbability(market.yesPrice) !== null);
    if (!markets.length) return null;
    const kind: PolymarketOddsKind = data.event ? 'event' : 'trending';
    if (markets.length === 1 && data.event) {
      const [market] = markets;
      return { kind, card: { title: market.question, rows: binaryRows(parseProbability(market.yesPrice), toChange(market.oneDayPriceChange)) } };
    }
    const rows = markets.slice(0, MAX_ROWS).map((market) => ({ label: market.question, probability: parseProbability(market.yesPrice), change: toChange(market.oneDayPriceChange) }));
    return { kind, card: { title: data.event?.title ?? 'Top markets by 24h volume', rows } };
  }

  const market = data.market;
  if (market?.question) {
    if (Array.isArray(market.topOutcomes)) {
      const rows = market.topOutcomes
        .map((entry: unknown) => (typeof entry === 'string' ? entry.match(/^(.*\S)\s+(\d+(?:\.\d+)?)%$/) : null))
        .filter(Boolean)
        .map((match: RegExpMatchArray) => ({ label: match[1], probability: Number(match[2]) / 100, change: null }));
      return rows.length ? { kind: 'subscribed', card: { title: market.question, rows } } : null;
    }
    const probability = parseProbability(market.currentPrice);
    return probability === null ? null : { kind: 'subscribed', card: { title: market.question, rows: binaryRows(probability, null) } };
  }

  return null;
}

// Uses the latest polymarket result that carries odds (event outcomes, market list, or a fresh subscription).
export function selectPolymarketOdds(toolResults: readonly ToolResult[]): PolymarketOddsSelection | null {
  for (const result of [...toolResults].reverse()) {
    if (result.toolName !== POLYMARKET_TOOL_NAME) continue;
    const selection = selectFromData(result.data);
    if (selection) return selection;
  }
  return null;
}

export function buildPolymarketOddsImage(toolResults: readonly ToolResult[], replyText: string): Buffer | null {
  const selection = selectPolymarketOdds(toolResults);
  if (!selection) {
    return null;
  }
  const language = detectLanguage(replyText);
  return generateOddsImage([selection.card], { subtitle: SUBTITLES[language][selection.kind], language });
}

export const POLYMARKET_ODDS_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: POLYMARKET_TOOL_NAME,
  fileName: 'polymarket-odds.png',
  build: buildPolymarketOddsImage,
};
