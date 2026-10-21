import { addMinutes, format, max, parse } from 'date-fns';
import { InlineKeyboard } from 'grammy';
import { CROWDING_EMOJI, getTravelCrowding } from '@services/israel-rail';
import type { CrowdingLevel, NearbyRailStation, RailStation, TrainLeg, TrainLine, TrainProgress, TrainTravel } from '@services/israel-rail';
import type { GeoPoint, LightRailDirectionDepartures, NearbyLightRailStation } from '@services/light-rail';
import { buildInlineKeyboard } from '@services/telegram';
import type { ImageLanguage } from '@shared/image-card';
import { ACTIONS_CALLBACK_PREFIX, MESSAGES } from './rail.config';

export type RailMenuAction = 'language' | 'contact' | 'cancel_contact';

// 'stops' carries the chosen train's own date and departure time instead of a search time.
export type RailSearchAction = 'later' | 'reverse' | 'stops' | 'refresh' | 'where';

export type RailDataSource = 'israel-rail' | 'light-rail';

export type RailSearchRequest = {
  readonly action: RailSearchAction;
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly time: string; // Format: "HH:mm"
  readonly language: ImageLanguage;
  readonly trainNumber?: number; // Only for 'where'
};

export type RailRouteContext = {
  readonly from: RailStation;
  readonly to: RailStation;
  readonly trains: readonly TrainTravel[];
  readonly searchedFrom: string; // Format: "YYYY-MM-DD HH:mm"
};

export type NearestStationsResult = {
  readonly origin: GeoPoint;
  readonly rail: NearbyRailStation | null;
  readonly lightRail: { readonly stop: NearbyLightRailStation; readonly directions: readonly LightRailDirectionDepartures[] } | null;
};

const CALLBACK_SEPARATOR = '|';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const ACTIONS: readonly RailSearchAction[] = ['later', 'reverse', 'stops', 'refresh', 'where'];

// Format: "later|3700|2300|2026-10-19|08:31|he", plus "|<trainNumber>" for 'where' (well under Telegram's 64-byte limit)
export function buildCallbackData(request: RailSearchRequest): string {
  const fields = [request.action, request.fromStationId, request.toStationId, request.date, request.time, request.language];
  return (request.action === 'where' ? [...fields, request.trainNumber] : fields).join(CALLBACK_SEPARATOR);
}

export function parseCallbackData(data: string): RailSearchRequest | null {
  const [action, from, to, date, time, language, train] = data.split(CALLBACK_SEPARATOR);
  if (!ACTIONS.includes(action as RailSearchAction)) return null;
  const fromStationId = Number(from);
  const toStationId = Number(to);
  if (!Number.isInteger(fromStationId) || !Number.isInteger(toStationId)) return null;
  if (!DATE_PATTERN.test(date ?? '') || !TIME_PATTERN.test(time ?? '')) return null;
  if (language !== 'he' && language !== 'en') return null;
  if (action !== 'where') return { action: action as RailSearchAction, fromStationId, toStationId, date, time, language };
  const trainNumber = Number(train);
  if (!train || !Number.isInteger(trainNumber)) return null;
  return { action, fromStationId, toStationId, date, time, language, trainNumber };
}

export function getNextSearchTime(trains: readonly TrainTravel[]): { readonly date: string; readonly time: string } | null {
  const last = trains[trains.length - 1];
  if (!last) return null;
  const next = addMinutes(parse(`${last.date} ${last.departureTime}`, 'yyyy-MM-dd HH:mm', new Date()), 1);
  return { date: format(next, 'yyyy-MM-dd'), time: format(next, 'HH:mm') };
}

// A refresh searches from the original time, or from now if that already passed, so departed trains drop off.
export function getRefreshSearchTime(date: string, time: string, nowLocal: Date): { readonly date: string; readonly time: string } {
  const refreshed = max([parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date()), nowLocal]);
  return { date: format(refreshed, 'yyyy-MM-dd'), time: format(refreshed, 'HH:mm') };
}

export function getRouteContext(toolResults: readonly { readonly toolName: string; readonly data: unknown }[]): RailRouteContext | null {
  const result = [...toolResults].reverse().find((r) => r.toolName === 'israel_rail' && (r.data as RailRouteContext)?.trains?.length);
  return (result?.data as RailRouteContext) ?? null;
}

export function buildRouteKeyboard(context: RailRouteContext, language: ImageLanguage): InlineKeyboard {
  const [date, time] = context.searchedFrom.split(' ');
  const next = getNextSearchTime(context.trains);
  const labels =
    language === 'he'
      ? { later: '⏭ רכבות מאוחרות יותר', reverse: '🔁 כיוון הפוך', refresh: '🔄 רענון', where: '🗺 איפה הרכבת שלי?' }
      : { later: '⏭ Later trains', reverse: '🔁 Reverse direction', refresh: '🔄 Refresh', where: '🗺 Where is my train?' };
  const buttons = [
    ...(next ? [{ text: labels.later, data: buildCallbackData({ action: 'later', fromStationId: context.from.id, toStationId: context.to.id, ...next, language }) }] : []),
    { text: labels.reverse, data: buildCallbackData({ action: 'reverse', fromStationId: context.to.id, toStationId: context.from.id, date, time, language }) },
    { text: labels.refresh, data: buildCallbackData({ action: 'refresh', fromStationId: context.from.id, toStationId: context.to.id, date, time, language }) },
  ];
  const firstLeg = context.trains[0]?.legs[0];
  if (firstLeg) {
    const where = buildCallbackData({
      action: 'where',
      fromStationId: firstLeg.from.id,
      toStationId: firstLeg.to.id,
      date: context.trains[0].date,
      time: firstLeg.departureTime,
      language,
      trainNumber: firstLeg.trainNumber,
    });
    buttons.push({ text: labels.where, data: where });
  }
  return buildInlineKeyboard(buttons, 2);
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

export function getAnswerSources(toolResults: readonly { readonly toolName: string; readonly data: unknown }[]): RailDataSource[] {
  const hasData = (toolName: string, key: string) => toolResults.some((r) => r.toolName === toolName && (r.data as Record<string, unknown[]>)?.[key]?.length);
  return [...(hasData('israel_rail', 'trains') ? ['israel-rail' as const] : []), ...(hasData('light_rail', 'departures') ? ['light-rail' as const] : [])];
}

// Format: updatedAt is "HH:mm" in Israel time
export function formatSourceFooter(source: RailDataSource, updatedAt: string, language: ImageLanguage, refreshed = false): string {
  if (source === 'light-rail') {
    return language === 'he' ? '_🗓 לוח זמנים מתוכנן (GTFS משרד התחבורה) · ללא נתוני זמן אמת_' : '_🗓 Scheduled timetable (MOT GTFS) · no live data_';
  }
  if (language === 'he') {
    return refreshed ? `_🔄 עודכן ${updatedAt} · rail.co.il (רוענן)_` : `_🕒 עודכן ${updatedAt} · rail.co.il_`;
  }
  return refreshed ? `_🔄 Updated ${updatedAt} · rail.co.il (refreshed)_` : `_🕒 Updated ${updatedAt} · rail.co.il_`;
}

export function appendSourceFooter(message: string, sources: readonly RailDataSource[], updatedAt: string, language: ImageLanguage, refreshed = false): string {
  if (!sources.length) return message;
  return [message, '', ...sources.map((source) => formatSourceFooter(source, updatedAt, language, refreshed))].join('\n');
}

export function formatTrainMapCaption(line: TrainLine, progress: TrainProgress, language: ImageLanguage): string {
  const he = language === 'he';
  const name = (station: RailStation) => (he ? station.nameHe : station.nameEn);
  const first = line.stops[0];
  const last = line.stops[line.stops.length - 1];
  const header = he ? `🚆 רכבת ${line.trainNumber} · ${name(first.station)} ← ${name(last.station)}` : `🚆 Train ${line.trainNumber} · ${name(first.station)} → ${name(last.station)}`;

  if (progress.status === 'not_started') {
    return [header, he ? `טרם יצאה · יוצאת מ${name(first.station)} ב-${first.time}` : `Not departed yet · leaves ${name(first.station)} at ${first.time}`].join('\n');
  }
  if (progress.status === 'finished') {
    return [header, he ? `הגיעה ל${name(last.station)}` : `Arrived at ${name(last.station)}`].join('\n');
  }

  const fromIndex = Math.floor(progress.position);
  const atStation = progress.position === fromIndex;
  const current = name(line.stops[fromIndex].station);
  const parts = [
    atStation
      ? he
        ? `📍 בתחנת ${current}`
        : `📍 At ${current}`
      : he
        ? `📍 בין ${current} ל${name(line.stops[fromIndex + 1].station)}`
        : `📍 Between ${current} and ${name(line.stops[fromIndex + 1].station)}`,
    progress.delayMinutes > 0 ? (he ? `⚠️ עיכוב ${progress.delayMinutes} דק׳` : `⚠️ ${progress.delayMinutes} min late`) : he ? '✅ בזמן' : '✅ On time',
  ];
  const note = progress.isLive ? [] : [he ? 'מיקום משוער לפי לוח הזמנים' : 'Position estimated from the timetable'];
  return [header, parts.join(' · '), ...note].join('\n');
}

// Used before we have any text to detect from (e.g. a voice message). Hebrew unless Telegram says otherwise.
export function getUserLanguage(languageCode?: string): ImageLanguage {
  return languageCode && !languageCode.toLowerCase().startsWith('he') ? 'en' : 'he';
}

const LONG_WALK_MINUTES = 25;

function formatWalk(
  { walkingMinutes, walkingMeters, walkingIsEstimate }: { readonly walkingMinutes: number; readonly walkingMeters: number; readonly walkingIsEstimate: boolean },
  language: ImageLanguage,
): string {
  const distance = walkingMeters >= 1000 ? `${(walkingMeters / 1000).toFixed(1)} ${language === 'he' ? 'ק״מ' : 'km'}` : `${Math.round(walkingMeters)} ${language === 'he' ? 'מ׳' : 'm'}`;
  const approx = walkingIsEstimate ? '~' : '';
  const walk = language === 'he' ? `🚶 ${approx}${walkingMinutes} דק׳ הליכה (${distance})` : `🚶 ${approx}${walkingMinutes} min walk (${distance})`;
  if (walkingMinutes <= LONG_WALK_MINUTES) return walk;
  return `${walk}\n${language === 'he' ? 'רחוק להליכה - כדאי אוטובוס או מונית 🚕' : 'A long walk - a bus or taxi may be better 🚕'}`;
}

export function formatNearestStationsMessage({ rail, lightRail }: NearestStationsResult, language: ImageLanguage): string {
  const he = language === 'he';
  const sections: string[] = [];
  if (rail) {
    const name = he ? rail.station.nameHe : rail.station.nameEn;
    sections.push([`🚆 *${he ? 'תחנת הרכבת הקרובה' : 'Nearest train station'}:* ${name}`, formatWalk(rail, language)].join('\n'));
  }
  if (lightRail) {
    const name = he ? lightRail.stop.station.nameHe : lightRail.stop.station.nameEn;
    const lines = [`🚊 *${he ? 'תחנת הקו האדום הקרובה' : 'Nearest Red Line stop'}:* ${name}`, formatWalk(lightRail.stop, language)];
    for (const { towards, departures } of lightRail.directions) {
      const times = departures.map(({ departureTime }) => departureTime).join(', ');
      lines.push(he ? `• לכיוון ${towards.nameHe}: ${times}` : `• Towards ${towards.nameEn}: ${times}`);
    }
    sections.push(lines.join('\n'));
  }
  if (!sections.length) return he ? 'לא מצאתי תחנות רכבת או רכבת קלה בקרבת המיקום הזה 🤷' : "I couldn't find any train or light rail stations near this location 🤷";
  const footer = he ? 'רוצים לנסוע? כתבו לי לאן, למשל "לחיפה" 🙂' : 'Going somewhere? Tell me where to, e.g. "to Haifa" 🙂';
  return [...sections, footer].join('\n\n');
}

export function buildWalkingDirectionsUrl(origin: GeoPoint, destination: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=walking`;
}

export function buildNearestStationsKeyboard({ origin, rail, lightRail }: NearestStationsResult, language: ImageLanguage): InlineKeyboard | null {
  const he = language === 'he';
  const keyboard = new InlineKeyboard();
  if (rail) keyboard.url(he ? '🚶 הליכה לרכבת' : '🚶 Walk to the train', buildWalkingDirectionsUrl(origin, rail.station));
  if (lightRail) keyboard.url(he ? '🚶 הליכה לרכבת הקלה' : '🚶 Walk to the light rail', buildWalkingDirectionsUrl(origin, lightRail.stop.station));
  return rail || lightRail ? keyboard : null;
}

export function buildLocationMemoryNote({ lat, lon }: GeoPoint): string {
  return `I shared my current location (${lat}, ${lon}). Use it as my origin for follow-up questions unless I say otherwise.`;
}

const MENU_ACTIONS: readonly RailMenuAction[] = ['language', 'contact', 'cancel_contact'];

// Format: "actions|language"
export function buildMenuCallbackData(action: RailMenuAction): string {
  return [ACTIONS_CALLBACK_PREFIX, action].join(CALLBACK_SEPARATOR);
}

export function parseMenuCallbackData(data: string): RailMenuAction | null {
  const [prefix, action, ...rest] = data.split(CALLBACK_SEPARATOR);
  if (prefix !== ACTIONS_CALLBACK_PREFIX || rest.length) return null;
  return MENU_ACTIONS.includes(action as RailMenuAction) ? (action as RailMenuAction) : null;
}

export function getContactUrl(username?: string): string | null {
  const handle = username?.trim().replace(/^@/, '');
  return handle ? `https://t.me/${handle}` : null;
}

export function getOppositeLanguage(language: ImageLanguage): ImageLanguage {
  return language === 'he' ? 'en' : 'he';
}

export function buildActionsKeyboard(language: ImageLanguage, contactUrl: string | null): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text(MESSAGES.switchLanguage[language], buildMenuCallbackData('language'))
    .row()
    .text(MESSAGES.contactMessageButton[language], buildMenuCallbackData('contact'))
    .row();
  if (contactUrl) keyboard.url(MESSAGES.contactChatButton[language], contactUrl).row();
  return keyboard;
}

export function buildContactCancelKeyboard(language: ImageLanguage): InlineKeyboard {
  return new InlineKeyboard().text(MESSAGES.contactCancelButton[language], buildMenuCallbackData('cancel_contact'));
}
