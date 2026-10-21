import { addDays, addMinutes, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { InlineKeyboard } from 'grammy';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { RailStation, TrainTravel } from '@services/israel-rail';
import { buildInlineKeyboard } from '@services/telegram';
import type { ImageLanguage } from '@shared/image-card';
import { WAKE_ALERT_CONFIG } from './rail.config';

export type WakeCallbackRequest =
  | { readonly action: 'wake' | 'wakeset'; readonly fromStationId: number; readonly toStationId: number; readonly date: string; readonly time: string; readonly language: ImageLanguage }
  | { readonly action: 'wakecancel'; readonly alertId: string; readonly language: ImageLanguage };

const CALLBACK_SEPARATOR = '|';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/;

// Formats: "wake|3700|2300|2026-10-19|08:31|he", "wakeset|3700|2300|2026-10-19|08:31|he", "wakecancel|<24 hex id>|he"
export function buildWakeCallbackData(request: WakeCallbackRequest): string {
  if (request.action === 'wakecancel') return [request.action, request.alertId, request.language].join(CALLBACK_SEPARATOR);
  return [request.action, request.fromStationId, request.toStationId, request.date, request.time, request.language].join(CALLBACK_SEPARATOR);
}

export function parseWakeCallbackData(data: string): WakeCallbackRequest | null {
  const parts = data.split(CALLBACK_SEPARATOR);
  const [action] = parts;
  const language = parts[parts.length - 1];
  if (language !== 'he' && language !== 'en') return null;

  if (action === 'wakecancel') {
    const [, alertId] = parts;
    return parts.length === 3 && OBJECT_ID_PATTERN.test(alertId ?? '') ? { action, alertId, language } : null;
  }
  if (action !== 'wake' && action !== 'wakeset') return null;
  const [, from, to, date, time] = parts;
  const fromStationId = Number(from);
  const toStationId = Number(to);
  if (parts.length !== 6 || !Number.isInteger(fromStationId) || !Number.isInteger(toStationId)) return null;
  if (!DATE_PATTERN.test(date ?? '') || !TIME_PATTERN.test(time ?? '')) return null;
  return { action, fromStationId, toStationId, date, time, language };
}

export function buildWakeButton(fromStationId: number, toStationId: number, searchedFrom: string, language: ImageLanguage): { readonly text: string; readonly data: string } {
  const [date, time] = searchedFrom.split(' ');
  const text = language === 'he' ? '⏰ תעירו אותי לפני התחנה' : '⏰ Wake me before my stop';
  return { text, data: buildWakeCallbackData({ action: 'wake', fromStationId, toStationId, date, time, language }) };
}

export function buildWakeTrainPickerKeyboard(trains: readonly TrainTravel[], fromStationId: number, toStationId: number, language: ImageLanguage): InlineKeyboard {
  const buttons = trains.slice(0, WAKE_ALERT_CONFIG.maxTrainChoices).map((travel) => ({
    text: language === 'he' ? `🚆 ${travel.departureTime} ← ${travel.arrivalTime}` : `🚆 ${travel.departureTime} → ${travel.arrivalTime}`,
    data: buildWakeCallbackData({ action: 'wakeset', fromStationId, toStationId, date: travel.date, time: travel.departureTime, language }),
  }));
  return buildInlineKeyboard(buttons, 1);
}

export function buildWakeCancelKeyboard(alertId: string, language: ImageLanguage): InlineKeyboard {
  const text = language === 'he' ? '🔕 ביטול ההתראה' : '🔕 Cancel alert';
  return buildInlineKeyboard([{ text, data: buildWakeCallbackData({ action: 'wakecancel', alertId, language }) }]);
}

export function findTravel(travels: readonly TrainTravel[], date: string, departureTime: string, trainNumbers?: readonly number[]): TrainTravel | null {
  const matchesTrains = (travel: TrainTravel) => !trainNumbers?.length || travel.legs.map((leg) => leg.trainNumber).join(',') === trainNumbers.join(',');
  return travels.find((travel) => travel.date === date && travel.departureTime === departureTime && matchesTrains(travel)) ?? null;
}

// Scheduled arrival as an absolute Date. Trains arriving after midnight roll over to the next day.
export function getScheduledArrivalAt(travel: TrainTravel): Date {
  const departureAt = fromZonedTime(`${travel.date}T${travel.departureTime}:00`, DEFAULT_TIMEZONE);
  const arrivalAt = fromZonedTime(`${travel.date}T${travel.arrivalTime}:00`, DEFAULT_TIMEZONE);
  return arrivalAt < departureAt ? addDays(arrivalAt, 1) : arrivalAt;
}

export function getArrivalDelayMinutes(travel: TrainTravel): number {
  const lastLeg = travel.legs[travel.legs.length - 1];
  return lastLeg?.arrivalDelayMinutes ?? lastLeg?.delayMinutes ?? 0;
}

export function getNotifyAt(scheduledArrivalAt: Date, delayMinutes: number): Date {
  return addMinutes(scheduledArrivalAt, delayMinutes - WAKE_ALERT_CONFIG.minutesBeforeArrival);
}

export function formatLocalTime(date: Date): string {
  return format(toZonedTime(date, DEFAULT_TIMEZONE), 'HH:mm');
}

export function formatWakeConfirmation(station: RailStation, notifyAt: Date, predictedArrivalAt: Date, language: ImageLanguage): string {
  if (language === 'he') {
    return `⏰ אעיר אתכם ב-${formatLocalTime(notifyAt)}, ${WAKE_ALERT_CONFIG.minutesBeforeArrival} דקות לפני ההגעה ל${station.nameHe} (${formatLocalTime(predictedArrivalAt)}).\nאם הרכבת תתעכב, אעדכן את ההתראה בהתאם.`;
  }
  return `⏰ I'll wake you at ${formatLocalTime(notifyAt)}, ${WAKE_ALERT_CONFIG.minutesBeforeArrival} minutes before you arrive at ${station.nameEn} (${formatLocalTime(predictedArrivalAt)}).\nIf the train is delayed, I'll shift the alert.`;
}

export function formatWakeMessage(station: RailStation, predictedArrivalAt: Date, delayMinutes: number, language: ImageLanguage): string {
  const time = formatLocalTime(predictedArrivalAt);
  if (language === 'he') {
    const delay = delayMinutes > 0 ? ` (איחור של ${delayMinutes} דק׳)` : '';
    return `⏰ להתעורר! מגיעים ל${station.nameHe} בעוד כ-${WAKE_ALERT_CONFIG.minutesBeforeArrival} דקות - ב-${time}${delay} 🚆`;
  }
  const delay = delayMinutes > 0 ? ` (${delayMinutes} min late)` : '';
  return `⏰ Wake up! You're arriving at ${station.nameEn} in about ${WAKE_ALERT_CONFIG.minutesBeforeArrival} minutes - at ${time}${delay} 🚆`;
}
