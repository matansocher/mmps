import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getDistance } from '@core/utils';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { TelegramClientService } from '@services/telegram-client';
import { TracksCacheService } from './cache';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, LOCATIONS } from './tracker.config';

export function findLocation(targetChatId: number) {
  return Object.values(LOCATIONS).find((location) => location.chatId === targetChatId) || null;
}

@Injectable()
export class TrackerController implements OnModuleInit {
  private readonly logger = new Logger(TrackerController.name);

  constructor(
    private readonly tracksCache: TracksCacheService,
    private readonly telegramClientService: TelegramClientService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, CALLBACK_QUERY, LOCATION, EDITED_MESSAGE } = TELEGRAM_EVENTS;
    const { START } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
      { event: LOCATION, handler: (callbackQuery) => this.locationHandler.call(this, callbackQuery) },
      { event: EDITED_MESSAGE, handler: (callbackQuery) => this.editedMessageHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, 'Welcome to the Tracker Bot! Please share your live location to get started.');
  }

  // first time starting a track
  private async locationHandler(message: Message): Promise<void> {
    const { chatId, location } = getMessageData(message);
    const inlineKeyboardButtons = Object.keys(LOCATIONS).map((locationKey) => {
      const { name, chatId } = LOCATIONS[locationKey];
      return { text: name, callback_data: [BOT_ACTIONS.TRACK, chatId].join(INLINE_KEYBOARD_SEPARATOR) };
    });
    await this.bot.sendMessage(chatId, 'Awesome! Who do you want to notify about your journey', { ...getInlineKeyboardMarkup(inlineKeyboardButtons, 2) });

    this.tracksCache.clearTrack();
    this.tracksCache.saveTrack({ startLocation: { lat: location.lat, lon: location.lon }, lastAnnounced: new Date(), startDate: new Date() });
  }

  // location is updated
  private async editedMessageHandler(message: Message): Promise<void> {
    const { chatId, location } = getMessageData(message);
    const track = this.tracksCache.getTrack();
    if (!track?.chatId || !location) {
      return;
    }

    const targetLocation = findLocation(track.chatId);
    if (!targetLocation) {
      return;
    }

    const distance = getDistance({ lat: location.lat, lon: location.lon }, { lat: targetLocation.lat, lon: targetLocation.lon });

    const alertsSent = track.alertsSent || {};

    if (distance <= 5000 && !alertsSent.within5000m) {
      const message = [`אני כבר מתקרב ונשארו לי עוד ${distance} מטר כדי להגיע`].join('\n');
      // await this.telegramClientService.sendMessage({ name: targetLocation.name, number: targetLocation.number, message });
      await this.bot.sendMessage(chatId, `Message sent to ${targetLocation.name}:\n${message}`);
      alertsSent.within5000m = true;
      this.tracksCache.saveTrack({ alertsSent, lastAnnounced: new Date() });
    }

    if (distance <= 200 && !alertsSent.arrived) {
      const message = ['אני ממש קרוב, עוד שניה פה בחוץ'].join('\n');
      // await this.telegramClientService.sendMessage({ name: targetLocation.name, number: targetLocation.number, message });
      await this.bot.sendMessage(chatId, `Message sent to ${targetLocation.name}:\n${message}`);
      alertsSent.arrived = true;
      this.tracksCache.clearTrack();
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [action, resource] = response.split(INLINE_KEYBOARD_SEPARATOR);
    switch (action) {
      case BOT_ACTIONS.TRACK:
        await this.handleTrack(chatId, parseInt(resource)).catch(() => {});
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        break;
      default:
        throw new Error('Invalid action');
    }
  }

  async handleTrack(chatId: number, targetChatId: number) {
    if (!this.tracksCache.getTrack()) {
      return;
    }
    this.tracksCache.saveTrack({ chatId: targetChatId });
    const { startLocation } = this.tracksCache.getTrack();
    const targetLocation = findLocation(targetChatId);
    const distance = getDistance({ lat: startLocation.lat, lon: startLocation.lon }, { lat: targetLocation.lat, lon: targetLocation.lon });

    await this.bot.sendMessage(chatId, `Tracking started! You are ${distance} meters away from ${targetLocation.name}.`);

    const message = ['שלום', `יצאתי לדרך ויש לי ${distance} מטר נסיעה עד שאני מגיע`].join('\n');
    // await this.telegramClientService.sendMessage({ name: targetLocation.name, number: targetLocation.number, message });
    await this.bot.sendMessage(chatId, `Message sent to ${targetLocation.name}:\n${message}`);

    this.tracksCache.saveTrack({ alertsSent: { trackingStarted: true } });
  }
}
