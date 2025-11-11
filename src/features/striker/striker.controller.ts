import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { notify } from '@services/notifier';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, provideTelegramBot, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { createUserPreference, getUserPreference, saveUserDetails, updateUserPreference } from '@shared/striker';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './striker.config';
import { getPlayerName, getStats, giveUp, HELP_MESSAGE, processGuess, revealNextClue, startNewGame, WELCOME_MESSAGE } from './utils';

const customErrorMessage = 'Oops, something went wrong! Please try again later.';

@Injectable()
export class StrikerController implements OnModuleInit {
  private readonly logger = new Logger(StrikerController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  onModuleInit(): void {
    const { COMMAND, TEXT, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, PLAY, CLUE, STATS, ACTIONS, HELP, GIVEUP } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: PLAY.command, handler: (message) => this.playHandler.call(this, message) },
      { event: COMMAND, regex: CLUE.command, handler: (message) => this.clueHandler.call(this, message) },
      { event: COMMAND, regex: STATS.command, handler: (message) => this.statsHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: COMMAND, regex: HELP.command, handler: (message) => this.helpHandler.call(this, message) },
      { event: COMMAND, regex: GIVEUP.command, handler: (message) => this.giveUpHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    await saveUserDetails(userDetails);
    await createUserPreference(chatId);
    await this.bot.sendMessage(chatId, WELCOME_MESSAGE);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  async playHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    const result = await startNewGame(chatId);
    await this.bot.sendMessage(chatId, result.message);

    if (result.player) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.PLAY, player: getPlayerName(result.player) }, userDetails);
    }
  }

  async clueHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const result = await revealNextClue(chatId);
    await this.bot.sendMessage(chatId, result.message);

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CLUE }, userDetails);
  }

  async statsHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const statsMessage = await getStats(chatId);
    await this.bot.sendMessage(chatId, statsMessage);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STATS }, userDetails);
  }

  async helpHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, HELP_MESSAGE);
  }

  async giveUpHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const result = await giveUp(chatId);

    await this.bot.sendPhoto(chatId, result.player.photo, { caption: result.message }).catch((err) => {
      this.logger.warn(`Failed to send player photo: ${err.message}`);
      this.bot.sendMessage(chatId, result.message);
    });

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.GIVE_UP, player: result.player ? getPlayerName(result.player) : undefined }, userDetails);
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text, userDetails } = getMessageData(message);

    if (text.startsWith('/')) {
      return;
    }

    const result = await processGuess(chatId, text);

    // If correct, send player image with message as caption, otherwise just send message
    if (result.isCorrect && result.player?.photo) {
      await this.bot.sendPhoto(chatId, result.player.photo, { caption: result.message }).catch((err) => {
        this.logger.warn(`Failed to send player photo: ${err.message}`);
        // Fallback to sending just the message if photo fails
        this.bot.sendMessage(chatId, result.message);
      });
    } else {
      await this.bot.sendMessage(chatId, result.message);
    }

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.GUESS, guess: text, isCorrect: result.isCorrect, player: getPlayerName(result.player), score: result.score }, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const userPreferences = await getUserPreference(chatId);

    const inlineKeyboardButtons = [
      userPreferences?.isStopped
        ? { text: '🔔 Subscribe to daily games', callback_data: `${BOT_ACTIONS.SUBSCRIBE}` }
        : { text: '🔕 Unsubscribe from daily games', callback_data: `${BOT_ACTIONS.UNSUBSCRIBE}` },
    ];

    await this.bot.sendMessage(chatId, '⚙️ How can I help you?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch(() => {});
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data, userDetails } = getCallbackQueryData(callbackQuery);

    if (!data) {
      return;
    }

    const [action] = data.split(INLINE_KEYBOARD_SEPARATOR);

    try {
      switch (action) {
        case BOT_ACTIONS.SUBSCRIBE:
          await this.subscribeHandler(chatId, userDetails);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.UNSUBSCRIBE:
          await this.unsubscribeHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE }, userDetails);
          break;

        default:
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown action' });
      }

      await this.bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
    } catch (err) {
      this.logger.error(`Error handling callback query, ${err}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Something went wrong. Please try again.', show_alert: true });
    }
  }

  async subscribeHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    await saveUserDetails(userDetails);
    await createUserPreference(chatId);

    const subscribeMessage = [
      '🎉 Success! You are now subscribed to daily Striker games!',
      '',
      `⚽️ You'll receive a new game daily (only if you don't have an active game).`,
      '',
      'Use /actions to manage your subscription.',
    ].join('\n');

    await this.bot.sendMessage(chatId, subscribeMessage);
  }

  async unsubscribeHandler(chatId: number): Promise<void> {
    await updateUserPreference(chatId, { isStopped: true });

    const unsubscribeMessage = ['👋 You have been unsubscribed from daily games.', '', 'You can still use /play anytime to start a new game!', '', 'Use /actions to subscribe again.'].join('\n');

    await this.bot.sendMessage(chatId, unsubscribeMessage);
  }
}
