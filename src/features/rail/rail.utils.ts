import { addMinutes, format, parse } from 'date-fns';
import type { InlineKeyboard } from 'grammy';
import type { RailStation, TrainTravel } from '@services/israel-rail';
import { buildInlineKeyboard } from '@services/telegram';
import type { ImageLanguage } from '@shared/image-card';

export type RailSearchAction = 'later' | 'reverse';

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
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

// Format: "later|3700|2300|2026-10-19|08:31|he" (well under Telegram's 64-byte limit)
export function buildCallbackData(request: RailSearchRequest): string {
  return [request.action, request.fromStationId, request.toStationId, request.date, request.time, request.language].join(CALLBACK_SEPARATOR);
}

export function parseCallbackData(data: string): RailSearchRequest | null {
  const [action, from, to, date, time, language] = data.split(CALLBACK_SEPARATOR);
  if (action !== 'later' && action !== 'reverse') return null;
  const fromStationId = Number(from);
  const toStationId = Number(to);
  if (!Number.isInteger(fromStationId) || !Number.isInteger(toStationId)) return null;
  if (!DATE_PATTERN.test(date ?? '') || !TIME_PATTERN.test(time ?? '')) return null;
  if (language !== 'he' && language !== 'en') return null;
  return { action, fromStationId, toStationId, date, time, language };
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
  const buttons = [
    ...(next ? [{ text: labels.later, data: buildCallbackData({ action: 'later', fromStationId: context.from.id, toStationId: context.to.id, ...next, language }) }] : []),
    { text: labels.reverse, data: buildCallbackData({ action: 'reverse', fromStationId: context.to.id, toStationId: context.from.id, date, time, language }) },
  ];
  return buildInlineKeyboard(buttons, 2);
}

export function formatTrainLine(travel: TrainTravel, language: ImageLanguage): string {
  const platform = travel.legs[0]?.originPlatform;
  const delay = travel.legs[0]?.delayMinutes ?? 0;
  const transfers = travel.transfers;
  if (language === 'he') {
    const parts = [`${travel.departureTime} ← ${travel.arrivalTime}`, `${travel.durationMinutes} דק׳`, platform ? `רציף ${platform}` : null, transfers ? `${transfers} החלפות` : 'ישירה'];
    if (delay > 0) parts.push(`⚠️ איחור ${delay} דק׳`);
    return `• ${parts.filter(Boolean).join(' · ')}`;
  }
  const parts = [
    `${travel.departureTime} → ${travel.arrivalTime}`,
    `${travel.durationMinutes} min`,
    platform ? `platform ${platform}` : null,
    transfers ? `${transfers} transfer${transfers > 1 ? 's' : ''}` : 'direct',
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
