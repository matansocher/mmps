import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDistance } from '@core/utils';
import { TracksCacheService } from '@features/tracker/cache';
import { getBotToken, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, LOCATIONS } from './tracker.config';

export function findLocation(targetChatId: number) {
  return Object.values(LOCATIONS).find((location) => location.chatId === targetChatId) || null;
}

@Injectable()
export class TrackerController implements OnModuleInit {
  private readonly logger = new Logger(TrackerController.name);
  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracksCache: TracksCacheService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {
    this.botToken = getBotToken(BOT_CONFIG.id, this.configService.get(BOT_CONFIG.token));
  }

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

    // this.bot.on('location', (message) => {
    //   const { chatId, location } = getMessageData(message);
    //   if (!location) return;
    //
    //   const { latitude, longitude } = message.location;
    //
    //   this.bot.sendMessage(chatId, `📍 Received location update:\nLatitude: ${latitude}\nLongitude: ${longitude}`);
    // });
    //
    // this.bot.on('edited_message', (message) => {
    //   const { chatId, location } = getMessageData(message);
    //   if (!location) return;
    //
    //   const { latitude, longitude } = message.location;
    //
    //   this.bot.sendMessage(chatId, `📍 Received location update:\nLatitude: ${latitude}\nLongitude: ${longitude}`);
    // });
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
    if (!this.tracksCache.getTrack()) {
      return;
    }
    const { chatId, location } = getMessageData(message);
    // if (shouldAnnounce(response)) {
    //   await this.bot.sendMessage(chatId, ''); // send a message to announce the location change - send message to the user and not yourself
    // }
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
  }
}
