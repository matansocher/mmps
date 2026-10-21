import { addMinutes, format, parse } from 'date-fns';
import type { InlineKeyboard } from 'grammy';
import { CROWDING_EMOJI, getTravelCrowding } from '@services/israel-rail';
import type { CrowdingLevel, RailStation, TrainLeg, TrainTravel } from '@services/israel-rail';
import { buildInlineKeyboard } from '@services/telegram';
import type { ImageLanguage } from '@shared/image-card';

// 'stops' carries the chosen train's own date and departure time instead of a search time.
export type RailSearchAction = 'later' | 'reverse' | 'stops';

export type RailSearchRequest = {
  readonly action: RailSearchAction;
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly time: string; // Format: "HH:mm"
  readonly language: ImageLanguage;
};

export type RailRouteContext = {
  readonly from: RailStation;
  readonly to: RailStation;
  readonly trains: readonly TrainTravel[];
  readonly searchedFrom: string; // Format: "YYYY-MM-DD HH:mm"
};

const CALLBACK_SEPARATOR = '|';
const STOPS_BUTTONS_PER_ROW = 5;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const ACTIONS: readonly RailSearchAction[] = ['later', 'reverse', 'stops'];

// Format: "later|3700|2300|2026-10-19|08:31|he" (well under Telegram's 64-byte limit)
export function buildCallbackData(request: RailSearchRequest): string {
  return [request.action, request.fromStationId, request.toStationId, request.date, request.time, request.language].join(CALLBACK_SEPARATOR);
}

export function parseCallbackData(data: string): RailSearchRequest | null {
  const [action, from, to, date, time, language] = data.split(CALLBACK_SEPARATOR);
  if (!ACTIONS.includes(action as RailSearchAction)) return null;
  const fromStationId = Number(from);
  const toStationId = Number(to);
  if (!Number.isInteger(fromStationId) || !Number.isInteger(toStationId)) return null;
  if (!DATE_PATTERN.test(date ?? '') || !TIME_PATTERN.test(time ?? '')) return null;
  if (language !== 'he' && language !== 'en') return null;
  return { action: action as RailSearchAction, fromStationId, toStationId, date, time, language };
}

export function getNextSearchTime(trains: readonly TrainTravel[]): { readonly date: string; readonly time: string } | null {
  const last = trains[trains.length - 1];
  if (!last) return null;
  const next = addMinutes(parse(`${last.date} ${last.departureTime}`, 'yyyy-MM-dd HH:mm', new Date()), 1);
  return { date: format(next, 'yyyy-MM-dd'), time: format(next, 'HH:mm') };
}

export function getRouteContext(toolResults: readonly { readonly toolName: string; readonly data: unknown }[]): RailRouteContext | null {
  const result = [...toolResults].reverse().find((r) => r.toolName === 'israel_rail' && (r.data as RailRouteContext)?.trains?.length);
  return (result?.data as RailRouteContext) ?? null;
}

export function buildRouteKeyboard(context: RailRouteContext, language: ImageLanguage): InlineKeyboard {
  const [date, time] = context.searchedFrom.split(' ');
  const next = getNextSearchTime(context.trains);
  const labels = language === 'he' ? { later: '⏭ רכבות מאוחרות יותר', reverse: '🔁 כיוון הפוך' } : { later: '⏭ Later trains', reverse: '🔁 Reverse direction' };
  const stopsButtons = context.trains.map((train) => ({
    text: `🛤 ${train.departureTime}`,
    data: buildCallbackData({ action: 'stops', fromStationId: context.from.id, toStationId: context.to.id, date: train.date, time: train.departureTime, language }),
  }));
  const buttons = [
    ...(next ? [{ text: labels.later, data: buildCallbackData({ action: 'later', fromStationId: context.from.id, toStationId: context.to.id, ...next, language }) }] : []),
    { text: labels.reverse, data: buildCallbackData({ action: 'reverse', fromStationId: context.to.id, toStationId: context.from.id, date, time, language }) },
  ];
  const keyboard = buildInlineKeyboard(stopsButtons, STOPS_BUTTONS_PER_ROW);
  buttons.forEach((button) => keyboard.text(button.text, button.data));
  return keyboard;
}

function formatStopLine(time: string, station: RailStation, language: ImageLanguage, platform?: number): string {
  const name = language === 'he' ? station.nameHe : station.nameEn;
  if (!platform) return `${time} · ${name}`;
  return `${time} · *${name}* (${language === 'he' ? 'רציף' : 'platform'} ${platform})`;
}

function formatLegStops(leg: TrainLeg, language: ImageLanguage): string {
  const header = language === 'he' ? `🛤 *רכבת ${leg.trainNumber} · ${leg.from.nameHe} ← ${leg.to.nameHe}*` : `🛤 *Train ${leg.trainNumber} · ${leg.from.nameEn} → ${leg.to.nameEn}*`;
  return [
    header,
    formatStopLine(leg.departureTime, leg.from, language, leg.originPlatform),
    ...leg.stops.map((stop) => formatStopLine(stop.departureTime, stop.station, language)),
    formatStopLine(leg.arrivalTime, leg.to, language, leg.destinationPlatform),
  ].join('\n');
}

// One section per leg, so a trip with transfers lists each train's stops separately.
export function formatStopsMessage(travel: TrainTravel, language: ImageLanguage): string {
  return travel.legs.map((leg) => formatLegStops(leg, language)).join('\n\n');
}

const CROWDING_LABELS: Record<ImageLanguage, Record<CrowdingLevel, string>> = {
  he: { quiet: 'עומס נמוך', moderate: 'עומס בינוני', busy: 'עומס גבוה' },
  en: { quiet: 'quiet', moderate: 'moderate', busy: 'busy' },
};

function formatCrowding(travel: TrainTravel, language: ImageLanguage): string | null {
  const crowding = getTravelCrowding(travel);
  return crowding ? `${CROWDING_EMOJI[crowding]} ${CROWDING_LABELS[language][crowding]}` : null;
}

export function formatTrainLine(travel: TrainTravel, language: ImageLanguage): string {
  const platform = travel.legs[0]?.originPlatform;
  const delay = travel.legs[0]?.delayMinutes ?? 0;
  const transfers = travel.transfers;
  if (language === 'he') {
    const parts = [
      `${travel.departureTime} ← ${travel.arrivalTime}`,
      `${travel.durationMinutes} דק׳`,
      platform ? `רציף ${platform}` : null,
      transfers ? `${transfers} החלפות` : 'ישירה',
      formatCrowding(travel, 'he'),
    ];
    if (delay > 0) parts.push(`⚠️ איחור ${delay} דק׳`);
    return `• ${parts.filter(Boolean).join(' · ')}`;
  }
  const parts = [
    `${travel.departureTime} → ${travel.arrivalTime}`,
    `${travel.durationMinutes} min`,
    platform ? `platform ${platform}` : null,
    transfers ? `${transfers} transfer${transfers > 1 ? 's' : ''}` : 'direct',
    formatCrowding(travel, 'en'),
  ];
  if (delay > 0) parts.push(`⚠️ ${delay} min late`);
  return `• ${parts.filter(Boolean).join(' · ')}`;
}

export function formatRouteMessage(context: RailRouteContext, railWebsiteUrl: string, language: ImageLanguage): string {
  const header = language === 'he' ? `🚆 *${context.from.nameHe} ← ${context.to.nameHe}*` : `🚆 *${context.from.nameEn} → ${context.to.nameEn}*`;
  const lines = context.trains.map((travel) => formatTrainLine(travel, language));
  const link = language === 'he' ? `[לבדיקה באתר רכבת ישראל](${railWebsiteUrl})` : `[Check on the Israel Railways website](${railWebsiteUrl})`;
  return [header, '', ...lines, '', link].join('\n');
}

// Used before we have any text to detect from (e.g. a voice message). Hebrew unless Telegram says otherwise.
export function getUserLanguage(languageCode?: string): ImageLanguage {
  return languageCode && !languageCode.toLowerCase().startsWith('he') ? 'en' : 'he';
}
