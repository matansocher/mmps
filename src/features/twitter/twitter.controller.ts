import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotifierService } from '@core/notifier';
import { getBotToken, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { getSubscriptions } from '@shared/twitter';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './twitter.config';
import { TwitterService } from './twitter.service';

const loaderMessage = '🐦 Fetching Twitter user details...';
const customErrorMessage = 'Sorry, something went wrong. Please try again later.';

@Injectable()
export class TwitterController implements OnModuleInit {
  private readonly logger = new Logger(TwitterController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly twitterService: TwitterService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, TEXT, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    const welcomeMessage = `Welcome to Twitter Tracker! 🐦

This bot allows you to subscribe to Twitter users and receive their daily tweets.

📝 How to use:
• Send me a Twitter username (e.g., @askdani__real or just askdani__real)
• I'll save it and start tracking their tweets
• Every day at 6:00 PM, you'll receive their latest tweets

📋 Commands:
• /list - View and manage your subscriptions

Let's get started! Send me a Twitter username to track.`;

    await this.bot.sendMessage(chatId, welcomeMessage);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  async listHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    const subscriptions = await getSubscriptions(chatId);

    if (subscriptions.length === 0) {
      await this.bot.sendMessage(chatId, 'You are not subscribed to any Twitter users yet.\n\nSend me a username (e.g., @askdani__real) to start tracking!');
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LIST_SUBSCRIPTIONS }, userDetails);
      return;
    }

    const listMessage = `📋 Your Twitter Subscriptions:\n🗑️ Click a button below to remove a subscription:`;

    const inlineKeyboardButtons = subscriptions.map((sub) => {
      const verifiedBadge = sub.verified ? '✓ ' : '';
      return {
        text: `🗑️ ${verifiedBadge}@${sub.username}`,
        callback_data: `${BOT_ACTIONS.REMOVE_USER} - ${sub.username}`,
      };
    });

    await this.bot.sendMessage(chatId, listMessage, { ...getInlineKeyboardMarkup(inlineKeyboardButtons, 2) });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LIST_SUBSCRIPTIONS }, userDetails);
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    // Prevent built-in commands from being processed here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) {
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const result = await this.twitterService.subscribeToUser(chatId, text);

      await this.bot.sendMessage(chatId, result.message);

      if (result.success) {
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ADD_SUBSCRIPTION, username: text }, userDetails);
      }
    });
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, callbackQueryId, userDetails, data } = getCallbackQueryData(callbackQuery);

    await this.bot.answerCallbackQuery(callbackQueryId);

    if (data.startsWith(BOT_ACTIONS.REMOVE_USER)) {
      const username = data.split(' - ')[1];
      const result = await this.twitterService.unsubscribeFromUser(chatId, username);

      await this.bot.sendMessage(chatId, result.message);

      if (result.success) {
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.REMOVE_SUBSCRIPTION, username }, userDetails);
      }
    }
  }
}
