import type { Bot } from 'grammy';
import { ObjectId } from 'mongodb';
import { getErrorMessage, Logger } from '@core/utils';
import { getStationById, searchTrains } from '@services/israel-rail';
import type { RailStation } from '@services/israel-rail';
import { BLOCKED_ERROR } from '@services/telegram';
import type { ImageLanguage } from '@shared/image-card';
import { finishWakeAlert, getPendingWakeAlertsDueBy, updateWakeAlertTiming, upsertWakeAlert, type WakeAlert } from './mongo';
import { findTravel, formatWakeMessage, getArrivalDelayMinutes, getNotifyAt, getScheduledArrivalAt } from './rail-wake.utils';
import { WAKE_ALERT_CONFIG } from './rail.config';

export type SetWakeAlertParams = {
  readonly chatId: number;
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly departureTime: string; // Format: "HH:mm"
  readonly language: ImageLanguage;
};

export type SetWakeAlertResult =
  | { readonly status: 'set'; readonly alertId: string; readonly station: RailStation; readonly notifyAt: Date; readonly predictedArrivalAt: Date }
  | { readonly status: 'not_found' }
  | { readonly status: 'too_late' };

const MINUTE_MS = 60_000;

export class RailWakeService {
  private readonly logger = new Logger(RailWakeService.name);
  private isProcessing = false;

  constructor(private readonly bot: Bot) {}

  async setAlert({ chatId, fromStationId, toStationId, date, departureTime, language }: SetWakeAlertParams): Promise<SetWakeAlertResult> {
    const { travels } = await searchTrains({ fromStationId, toStationId, date, hour: departureTime, limit: WAKE_ALERT_CONFIG.maxTrainChoices });
    const travel = findTravel(travels, date, departureTime);
    const station = getStationById(toStationId);
    if (!travel || !station) return { status: 'not_found' };

    const scheduledArrivalAt = getScheduledArrivalAt(travel);
    const delayMinutes = getArrivalDelayMinutes(travel);
    const notifyAt = getNotifyAt(scheduledArrivalAt, delayMinutes);
    if (notifyAt.getTime() <= Date.now()) return { status: 'too_late' };

    const trainNumbers = travel.legs.map((leg) => leg.trainNumber);
    const alertId = await upsertWakeAlert({ chatId, language, fromStationId, toStationId, date, departureTime, trainNumbers, scheduledArrivalAt, delayMinutes, notifyAt });
    return { status: 'set', alertId: alertId.toString(), station, notifyAt, predictedArrivalAt: new Date(scheduledArrivalAt.getTime() + delayMinutes * MINUTE_MS) };
  }

  async cancelAlert(alertId: string, chatId: number): Promise<boolean> {
    return finishWakeAlert(new ObjectId(alertId), 'cancelled', chatId);
  }

  // Runs every minute: refreshes live delays for alerts that are close, then sends the ones that are due.
  async processDueAlerts(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const now = Date.now();
      const alerts = await getPendingWakeAlertsDueBy(new Date(now + WAKE_ALERT_CONFIG.recheckWindowMinutes * MINUTE_MS));
      for (const alert of alerts) {
        await this.processAlert(alert, now).catch((err) => this.logger.error(`processAlert ${alert._id} failed: ${getErrorMessage(err)}`));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAlert(alert: WakeAlert, now: number): Promise<void> {
    let { delayMinutes, notifyAt } = alert;
    const predictedArrivalAt = () => alert.scheduledArrivalAt.getTime() + delayMinutes * MINUTE_MS;

    // Missed it entirely (e.g. the bot was down) - a wake-up after arrival is useless.
    if (predictedArrivalAt() <= now) {
      await finishWakeAlert(alert._id, 'expired');
      return;
    }

    const lastCheckedAt = alert.lastCheckedAt?.getTime() ?? 0;
    if (notifyAt.getTime() > now && now - lastCheckedAt >= WAKE_ALERT_CONFIG.recheckIntervalMinutes * MINUTE_MS) {
      const liveDelay = await this.fetchLiveDelay(alert);
      delayMinutes = liveDelay ?? delayMinutes;
      notifyAt = getNotifyAt(alert.scheduledArrivalAt, delayMinutes);
      await updateWakeAlertTiming(alert._id, delayMinutes, notifyAt);
    }

    if (notifyAt.getTime() > now) return;
    if (!(await finishWakeAlert(alert._id, 'sent'))) return;

    const station = getStationById(alert.toStationId) ?? { id: alert.toStationId, nameEn: String(alert.toStationId), nameHe: String(alert.toStationId) };
    const text = formatWakeMessage(station, new Date(predictedArrivalAt()), delayMinutes, alert.language);
    await this.bot.api.sendMessage(alert.chatId, text).catch((err) => {
      const message = getErrorMessage(err);
      if (!message.includes(BLOCKED_ERROR)) this.logger.error(`Failed to send wake alert ${alert._id}: ${message}`);
    });
  }

  private async fetchLiveDelay(alert: WakeAlert): Promise<number | null> {
    try {
      const { fromStationId, toStationId, date, departureTime, trainNumbers } = alert;
      const { travels } = await searchTrains({ fromStationId, toStationId, date, hour: departureTime, limit: WAKE_ALERT_CONFIG.maxTrainChoices });
      const travel = findTravel(travels, date, departureTime, trainNumbers);
      return travel ? getArrivalDelayMinutes(travel) : null;
    } catch (err) {
      this.logger.warn(`fetchLiveDelay ${alert._id} failed: ${getErrorMessage(err)}`);
      return null;
    }
  }
}
