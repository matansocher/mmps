import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { notify } from '@services/notifier';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, provideTelegramBot, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { createUserPreference, DifficultyLevel, getUserPreference, Language, saveUserDetails, updateUserPreference } from '@shared/langly';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, DAILY_CHALLENGE_HOURS, DIFFICULTY_LABELS, INLINE_KEYBOARD_SEPARATOR, LANGUAGE_LABELS } from './langly.config';
import { LanglyService } from './langly.service';

@Injectable()
export class LanglyController implements OnModuleInit {
  private readonly logger = new Logger(LanglyController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly langlyService: LanglyService) {}

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
      '👋 Welcome to Langly - Your Language Learning Bot!',
      '',
      "🎯 I'll help you improve your language skills with fun challenges focused on:",
      '• Vocabulary and practical words',
      '• Common idioms and expressions',
      '• Colloquial language that natives actually use',
      '• False friends and tricky translations',
      '',
      '🌍 Supported languages:',
      `${Object.values(LANGUAGE_LABELS).join(' | ')}`,
      '',
      '📚 Difficulty levels:',
      '🌱 Beginner | 📚 Intermediate | 🎓 Advanced | 🏆 Native',
      '',
      'Commands:',
      '/challenge - Get a language challenge',
      '/actions - Manage your subscription, language, and difficulty level',
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const userPreferences = await getUserPreference(chatId);
    const currentDifficulty = userPreferences?.difficulty ?? DifficultyLevel.INTERMEDIATE;
    const currentLanguage = userPreferences?.language ?? Language.SPANISH;

    const inlineKeyboardButtons = [
      userPreferences?.isStopped
        ? { text: '🔔 Subscribe to daily challenges', callback_data: `${BOT_ACTIONS.SUBSCRIBE}` }
        : { text: '🔕 Unsubscribe from daily challenges', callback_data: `${BOT_ACTIONS.UNSUBSCRIBE}` },
      { text: `🌍 Change Language (Current: ${LANGUAGE_LABELS[currentLanguage]})`, callback_data: `${BOT_ACTIONS.LANGUAGE}` },
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
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE }, userDetails);
    } catch (err) {
      this.logger.error(`Error sending challenge:, ${err}`);
      await this.bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE, error: `❗️ ${err}` }, userDetails);
    }
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
          await this.subscribeHandler(chatId, userDetails);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.UNSUBSCRIBE:
          await this.unsubscribeHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.ANSWER:
          const [answerIndex, isCorrect] = params;
          const answerResult = await this.answerHandler(chatId, messageId, parseInt(answerIndex), isCorrect === 'true');
          if (answerResult) {
            notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, word: answerResult.word, type: answerResult.type, isCorrect: answerResult.isCorrect ? '✅' : '❌' }, userDetails);
          }
          break;

        case BOT_ACTIONS.AUDIO:
          const [challengeKey] = params;
          await this.audioHandler(chatId, messageId, challengeKey);
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.AUDIO }, userDetails);
          break;

        case BOT_ACTIONS.LANGUAGE:
          if (params.length === 0) {
            await this.languageHandler(chatId);
          } else {
            const selectedLanguage = params[0] as Language;
            await this.languageHandler(chatId, selectedLanguage);
            notify(BOT_CONFIG, { action: 'LANGUAGE_CHANGED', language: LANGUAGE_LABELS[selectedLanguage] }, userDetails);
          }
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;

        case BOT_ACTIONS.DIFFICULTY:
          if (params.length === 0) {
            await this.difficultyHandler(chatId);
          } else {
            const selectedDifficulty = parseInt(params[0]);
            await this.difficultyHandler(chatId, selectedDifficulty);
            notify(BOT_CONFIG, { action: 'DIFFICULTY_CHANGED', difficulty: DIFFICULTY_LABELS[selectedDifficulty] }, userDetails);
          }
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;

        case BOT_ACTIONS.CONTACT:
          await this.contactHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
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
      '🎉 Success! You are now subscribed to daily Spanish challenges!',
      '',
      `📅 You'll receive challenges at ${DAILY_CHALLENGE_HOURS.join(' and ')}:00 every day.`,
      '',
      'Use /actions to manage your subscription.',
    ].join('\n');

    await this.bot.sendMessage(chatId, subscribeMessage);
  }

  async unsubscribeHandler(chatId: number): Promise<void> {
    await updateUserPreference(chatId, { isStopped: true });

    const unsubscribeMessage = [
      // br
      '👋 You have been unsubscribed from daily challenges.',
      '',
      'You can still use /challenge anytime to practice Spanish!',
      '',
      'Use /actions to subscribe again.',
    ].join('\n');

    await this.bot.sendMessage(chatId, unsubscribeMessage);
  }

  async answerHandler(chatId: number, messageId: number, answerIndex: number, isCorrect: boolean): Promise<{ word: string; type: string; isCorrect: boolean } | null> {
    return await this.langlyService.handleAnswer(chatId, messageId, answerIndex, isCorrect);
  }

  async audioHandler(chatId: number, messageId: number, challengeKey: string): Promise<void> {
    await this.langlyService.sendAudioPronunciation(chatId, messageId, challengeKey);
  }

  async languageHandler(chatId: number, selectedLanguage?: Language): Promise<void> {
    if (!selectedLanguage) {
      const languageButtons = Object.values(Language).map((l) => ({ text: LANGUAGE_LABELS[l], callback_data: [BOT_ACTIONS.LANGUAGE, l].join(INLINE_KEYBOARD_SEPARATOR) }));

      await this.bot.sendMessage(chatId, '🌍 Select your preferred language:', { ...getInlineKeyboardMarkup(languageButtons) });
    } else {
      // Save selected language
      await updateUserPreference(chatId, { language: selectedLanguage });

      const confirmationMessage = [`✅ Language updated to: ${LANGUAGE_LABELS[selectedLanguage]}`, '', 'Your next challenges will be in this language!'].join('\n');

      await this.bot.sendMessage(chatId, confirmationMessage);
    }
  }

  async difficultyHandler(chatId: number, selectedDifficulty?: number): Promise<void> {
    if (!selectedDifficulty) {
      // Show difficulty selection menu
      const difficultyButtons = [
        { text: DIFFICULTY_LABELS[DifficultyLevel.BEGINNER], callback_data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.BEGINNER].join(INLINE_KEYBOARD_SEPARATOR) },
        { text: DIFFICULTY_LABELS[DifficultyLevel.INTERMEDIATE], callback_data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.INTERMEDIATE].join(INLINE_KEYBOARD_SEPARATOR) },
        { text: DIFFICULTY_LABELS[DifficultyLevel.ADVANCED], callback_data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.ADVANCED].join(INLINE_KEYBOARD_SEPARATOR) },
        { text: DIFFICULTY_LABELS[DifficultyLevel.NATIVE], callback_data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.NATIVE].join(INLINE_KEYBOARD_SEPARATOR) },
      ];

      await this.bot.sendMessage(chatId, '📊 Select your difficulty level:', { ...getInlineKeyboardMarkup(difficultyButtons) });
    } else {
      // Save selected difficulty
      await updateUserPreference(chatId, { difficulty: selectedDifficulty });

      const confirmationMessage = [`✅ Difficulty level updated to: ${DIFFICULTY_LABELS[selectedDifficulty]}`, '', 'Your next challenges will be at this difficulty level!'].join('\n');

      await this.bot.sendMessage(chatId, confirmationMessage);
    }
  }

  private async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, ['Happy to help! 🤝', '', 'You can reach the creator at:', MY_USER_NAME].join('\n'));
  }
}
