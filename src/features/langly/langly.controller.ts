import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getBotToken, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './langly.config';
import { LanglyService } from './langly.service';

const loaderMessage = '🇪🇸 Un momento, por favor...';

@Injectable()
export class LanglyController implements OnModuleInit {
  private readonly logger = new Logger(LanglyController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly langlyService: LanglyService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LESSON, CHALLENGE, RANDOM, HELP } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LESSON.command, handler: (message) => this.lessonHandler.call(this, message) },
      { event: COMMAND, regex: CHALLENGE.command, handler: (message) => this.challengeHandler.call(this, message) },
      { event: COMMAND, regex: RANDOM.command, handler: (message) => this.randomHandler.call(this, message) },
      { event: COMMAND, regex: HELP.command, handler: (message) => this.helpHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
    const welcomeMessage = [
      `¡Hola! 👋 Welcome to Langly, your fun Spanish teacher!`,
      ``,
      `I'm here to help intermediate Spanish learners like you master:`,
      `• 🎭 Idiomatic expressions and their origins`,
      `• 🌍 Regional variations and slang`,
      `• 🤔 False friends (tricky similar words)`,
      `• 🎉 Real-world Spanish that people actually use`,
      ``,
      `Commands:`,
      `/lesson - Get an AI-generated Spanish lesson`,
      `/challenge - Try an interactive challenge`,
      `/random - Get a random expression`,
      `/help - Show this help`,
      ``,
      `¡Vamos a aprender!`,
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage);
  }

  private async lessonHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      reactionEmoji: '📚',
      loaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.langlyService.sendMorningLesson(chatId);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LESSON }, userDetails);
  }

  private async challengeHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      reactionEmoji: '🎯',
      loaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.langlyService.startChallenge(chatId);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE }, userDetails);
  }

  private async randomHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      reactionEmoji: '🎲',
      loaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.langlyService.getRandomLesson(chatId);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.RANDOM }, userDetails);
  }

  private async helpHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const helpMessage = [
      `🇪🇸 **Langly Commands:**`,
      ``,
      `/lesson - Get a Spanish lesson`,
      `/challenge - Start a fun challenge`,
      `/random - Get a random expression`,
      `/help - Show this help message`,
      ``,
      `Each command generates unique AI-powered content!`,
    ].join('\n');

    const buttons = [{ text: '📬 Contact', callback_data: `${BOT_ACTIONS.CONTACT}` }];

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown',
      ...getInlineKeyboardMarkup(buttons, 1),
    });
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, text, userDetails } = getMessageData(message);

    // Ignore commands
    if (text.startsWith('/')) return;

    // For now, just send a friendly response
    await this.bot.sendMessage(chatId, `I received your message! Use /help to see available commands, or try /challenge for a fun Spanish quiz!`);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [action, ...params] = response.split('-');

    switch (action) {
      case BOT_ACTIONS.CONTACT:
        await this.handleContact(chatId, messageId);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;

      case BOT_ACTIONS.PRONOUNCE:
        await this.handlePronounce(chatId, params.join('-'));
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.PRONOUNCE }, userDetails);
        break;

      case BOT_ACTIONS.ANSWER:
        const [isCorrect, answerIndex] = params;
        await this.langlyService.handleChallengeAnswer(chatId, messageId, isCorrect === 'correct', parseInt(answerIndex));
        this.notifier.notify(
          BOT_CONFIG,
          {
            action: isCorrect === 'correct' ? ANALYTIC_EVENT_NAMES.ANSWER_CORRECT : ANALYTIC_EVENT_NAMES.ANSWER_WRONG,
          },
          userDetails,
        );
        break;

      case BOT_ACTIONS.NEXT_CHALLENGE:
        await this.langlyService.startChallenge(chatId);
        break;

      case BOT_ACTIONS.HINT:
        await this.langlyService.showHint(chatId, callbackQuery.id);
        break;

      default:
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        break;
    }
  }

  private async handleContact(chatId: number, messageId: number): Promise<void> {
    await this.bot.editMessageText(`📬 You can contact my creator: ${MY_USER_NAME}\n\nFeel free to suggest improvements or report issues!`, { chat_id: chatId, message_id: messageId });
  }

  private async handlePronounce(chatId: number, text: string): Promise<void> {
    await this.langlyService.handlePronunciation(chatId, text);
  }
}
