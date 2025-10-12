import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getBotToken, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { createUserPreference, DifficultyLevel, getUserPreference, saveUserDetails, updateUserPreference } from '@shared/langly';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, DAILY_CHALLENGE_HOURS, DIFFICULTY_LABELS, INLINE_KEYBOARD_SEPARATOR } from './langly.config';
import { LanglyService } from './langly.service';

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
    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, CHALLENGE, ACTIONS } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: CHALLENGE.command, handler: (message) => this.challengeHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await createUserPreference(chatId);
    await saveUserDetails(userDetails);

    const welcomeMessage = [
      '¡Hola! 👋 Welcome to Langly Spanish Learning Bot!',
      '',
      "🎯 I'll help you improve your Argentine Spanish with fun challenges focused on:",
      '• False friends (tricky words that look like English)',
      '• Common idioms and expressions',
      '• Colloquial Spanish that natives actually use',
      '• Regional variations from Argentina',
      '',
      '📚 Choose your difficulty level:',
      '🌱 Beginner | 📚 Intermediate (default) | 🎓 Advanced | 🏆 Native',
      '',
      'Commands:',
      '/challenge - Get a Spanish challenge',
      '/actions - Manage your subscription and difficulty level',
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const userPreferences = await getUserPreference(chatId);
    const currentDifficulty = userPreferences?.difficulty ?? DifficultyLevel.INTERMEDIATE;

    const inlineKeyboardButtons = [
      userPreferences?.isStopped
        ? { text: '🔔 Subscribe to daily challenges', callback_data: `${BOT_ACTIONS.SUBSCRIBE}` }
        : { text: '🔕 Unsubscribe from daily challenges', callback_data: `${BOT_ACTIONS.UNSUBSCRIBE}` },
      { text: `📊 Change Difficulty (Current: ${DIFFICULTY_LABELS[currentDifficulty]})`, callback_data: `${BOT_ACTIONS.DIFFICULTY}` },
      { text: '📬 Contact', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];

    await this.bot.sendMessage(chatId, '⚙️ How can I help you?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch(() => {});
  }

  private async challengeHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    try {
      await this.bot.sendChatAction(chatId, 'typing');
      await this.langlyService.sendChallenge(chatId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE }, userDetails);
    } catch (err) {
      this.logger.error(`Error sending challenge:, ${err}`);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE, error: `❗️ ${err}` }, userDetails);
    }
  }

  private async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, ['Happy to help! 🤝', '', 'You can reach the creator at:', MY_USER_NAME].join('\n'));
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data, userDetails } = getCallbackQueryData(callbackQuery);

    if (!data) {
      return;
    }

    const [action, ...params] = data.split(INLINE_KEYBOARD_SEPARATOR);

    try {
      switch (action) {
        case BOT_ACTIONS.SUBSCRIBE:
          await saveUserDetails(userDetails);
          await createUserPreference(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});

          const subscribeMessage = [
            '🎉 Success! You are now subscribed to daily Spanish challenges!',
            '',
            `📅 You'll receive challenges at ${DAILY_CHALLENGE_HOURS.join(' and ')}:00 every day.`,
            '',
            'Use /actions to manage your subscription.',
          ].join('\n');

          await this.bot.sendMessage(chatId, subscribeMessage);
          await this.bot.answerCallbackQuery(callbackQuery.id);
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.UNSUBSCRIBE:
          await updateUserPreference(chatId, { isStopped: true });
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});

          const unsubscribeMessage = [
            '👋 You have been unsubscribed from daily challenges.',
            '',
            'You can still use /challenge anytime to practice Spanish!',
            '',
            'Use /actions to subscribe again.',
          ].join('\n');

          await this.bot.sendMessage(chatId, unsubscribeMessage);
          await this.bot.answerCallbackQuery(callbackQuery.id);
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.ANSWER:
          const [answerIndex, isCorrect] = params;
          const answerResult = await this.langlyService.handleAnswer(chatId, messageId, parseInt(answerIndex), isCorrect === 'true');
          await this.bot.answerCallbackQuery(callbackQuery.id);
          if (answerResult) {
            this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, word: answerResult.word, type: answerResult.type, isCorrect: answerResult.isCorrect ? '✅' : '❌' }, userDetails);
          }
          break;

        case BOT_ACTIONS.AUDIO:
          const [challengeKey] = params;
          await this.langlyService.sendAudioPronunciation(chatId, challengeKey);
          await this.bot.answerCallbackQuery(callbackQuery.id);
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.AUDIO }, userDetails);
          break;

        case BOT_ACTIONS.DIFFICULTY:
          if (params.length === 0) {
            // Show difficulty selection menu
            const difficultyButtons = [
              { text: DIFFICULTY_LABELS[DifficultyLevel.BEGINNER], callback_data: `${BOT_ACTIONS.DIFFICULTY}${INLINE_KEYBOARD_SEPARATOR}${DifficultyLevel.BEGINNER}` },
              { text: DIFFICULTY_LABELS[DifficultyLevel.INTERMEDIATE], callback_data: `${BOT_ACTIONS.DIFFICULTY}${INLINE_KEYBOARD_SEPARATOR}${DifficultyLevel.INTERMEDIATE}` },
              { text: DIFFICULTY_LABELS[DifficultyLevel.ADVANCED], callback_data: `${BOT_ACTIONS.DIFFICULTY}${INLINE_KEYBOARD_SEPARATOR}${DifficultyLevel.ADVANCED}` },
              { text: DIFFICULTY_LABELS[DifficultyLevel.NATIVE], callback_data: `${BOT_ACTIONS.DIFFICULTY}${INLINE_KEYBOARD_SEPARATOR}${DifficultyLevel.NATIVE}` },
            ];

            await this.bot.deleteMessage(chatId, messageId).catch(() => {});
            await this.bot.sendMessage(chatId, '📊 Select your difficulty level:', { ...getInlineKeyboardMarkup(difficultyButtons) });
            await this.bot.answerCallbackQuery(callbackQuery.id);
          } else {
            // Save selected difficulty
            const selectedDifficulty = parseInt(params[0]);
            await updateUserPreference(chatId, { difficulty: selectedDifficulty });
            await this.bot.deleteMessage(chatId, messageId).catch(() => {});

            const confirmationMessage = [`✅ Difficulty level updated to: ${DIFFICULTY_LABELS[selectedDifficulty]}`, '', 'Your next challenges will be at this difficulty level!'].join('\n');

            await this.bot.sendMessage(chatId, confirmationMessage);
            await this.bot.answerCallbackQuery(callbackQuery.id);
            this.notifier.notify(BOT_CONFIG, { action: 'DIFFICULTY_CHANGED', difficulty: DIFFICULTY_LABELS[selectedDifficulty] }, userDetails);
          }
          break;

        case BOT_ACTIONS.CONTACT:
          await this.contactHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          await this.bot.answerCallbackQuery(callbackQuery.id);
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
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
