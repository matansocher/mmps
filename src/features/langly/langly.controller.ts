import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getBotToken, getCallbackQueryData, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './langly.config';
import { LanglyService } from './langly.service';

@Injectable()
export class LanglyController implements OnModuleInit {
  private readonly logger = new Logger(LanglyController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly langlyService: LanglyService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, CHALLENGE } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: CHALLENGE.command, handler: (message) => this.challengeHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const welcomeMessage = [
      '¡Hola! 👋 Welcome to Langly Spanish Learning Bot!',
      '',
      "🎯 I'll help you improve your Spanish with fun challenges focused on:",
      '• False friends (tricky words that look like English)',
      '• Common idioms and expressions',
      '• Colloquial Spanish that natives actually use',
      '• Regional variations',
      '',
      '📚 Perfect for intermediate learners who want to sound more natural!',
      '',
      'Use /challenge to get started with your first Spanish challenge!',
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage);
  }

  private async challengeHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    try {
      await this.bot.sendChatAction(chatId, 'typing');
      await this.langlyService.sendChallenge(chatId);
    } catch (err) {
      this.logger.error(`Error sending challenge:, ${err}`);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data } = getCallbackQueryData(callbackQuery);

    if (!data) {
      return;
    }

    const [action, ...params] = data.split(INLINE_KEYBOARD_SEPARATOR);

    try {
      switch (action) {
        case BOT_ACTIONS.ANSWER:
          const [answerIndex, isCorrect] = params;
          await this.langlyService.handleAnswer(chatId, messageId, parseInt(answerIndex), isCorrect === 'true');
          await this.bot.answerCallbackQuery(callbackQuery.id);
          break;

        case BOT_ACTIONS.AUDIO:
          const [challengeKey] = params;
          await this.langlyService.sendAudioPronunciation(chatId, challengeKey);
          await this.bot.answerCallbackQuery(callbackQuery.id);
          break;

        default:
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown action' });
      }
    } catch (err) {
      this.logger.error(`Error handling callback query, ${err}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Something went wrong. Please try again.', show_alert: true });
    }
  }
}
