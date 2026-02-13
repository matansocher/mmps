import type { Context } from 'grammy';
import { MY_USER_NAME } from '@core/config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, provideTelegramBot, UserDetails } from '@services/telegram-grammy';
import { createUserPreference, DifficultyLevel, getUserPreference, Language, LANGUAGES, saveUserDetails, updateUserPreference } from '@shared/langly';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, DAILY_CHALLENGE_HOURS, DIFFICULTY_LABELS, INLINE_KEYBOARD_SEPARATOR, LANGUAGE_LABELS } from './langly.config';
import { LanglyService } from './langly.service';

export class LanglyController {
  private readonly logger = new Logger(LanglyController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly langlyService: LanglyService) {}

  init(): void {
    const { START, CHALLENGE, ACTIONS } = BOT_CONFIG.commands;

    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(CHALLENGE.command.replace('/', ''), (ctx) => this.challengeHandler(ctx));
    this.bot.command(ACTIONS.command.replace('/', ''), (ctx) => this.actionsHandler(ctx));
    this.bot.on('callback_query', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
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

    await ctx.reply(welcomeMessage);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    const userPreferences = await getUserPreference(chatId);
    const currentDifficulty = userPreferences?.difficulty ?? DifficultyLevel.INTERMEDIATE;
    const currentLanguage = userPreferences?.language ?? LANGUAGES.SPANISH;

    const keyboard = buildInlineKeyboard([
      userPreferences?.isStopped
        ? { text: '🔔 Subscribe to daily challenges', data: `${BOT_ACTIONS.SUBSCRIBE}` }
        : { text: '🔕 Unsubscribe from daily challenges', data: `${BOT_ACTIONS.UNSUBSCRIBE}` },
      { text: `🌍 Change Language (Current: ${LANGUAGE_LABELS[currentLanguage]})`, data: `${BOT_ACTIONS.LANGUAGE}` },
      { text: `📊 Change Difficulty (Current: ${DIFFICULTY_LABELS[currentDifficulty]})`, data: `${BOT_ACTIONS.DIFFICULTY}` },
      { text: '📬 Contact', data: `${BOT_ACTIONS.CONTACT}` },
    ]);

    await ctx.reply('⚙️ How can I help you?', { reply_markup: keyboard });
    await ctx.deleteMessage().catch(() => {});
  }

  private async challengeHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);

    try {
      await ctx.replyWithChatAction('typing');
      await this.langlyService.sendChallenge(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE }, userDetails);
    } catch (err) {
      this.logger.error(`Error sending challenge:, ${err}`);
      await ctx.reply('❌ Sorry, something went wrong. Please try again.');
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHALLENGE, error: `❗️ ${err}` }, userDetails);
    }
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, data, userDetails } = getCallbackQueryData(ctx);

    if (!data) {
      return;
    }

    const [action, ...params] = data.split(INLINE_KEYBOARD_SEPARATOR);

    try {
      switch (action) {
        case BOT_ACTIONS.SUBSCRIBE:
          await this.subscribeHandler(ctx, chatId, userDetails);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.UNSUBSCRIBE:
          await this.unsubscribeHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE }, userDetails);
          break;

        case BOT_ACTIONS.ANSWER: {
          const [answerIndex, isCorrect] = params;
          const answerResult = await this.answerHandler(chatId, messageId, parseInt(answerIndex), isCorrect === 'true');
          if (answerResult) {
            notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, word: answerResult.word, type: answerResult.type, isCorrect: answerResult.isCorrect ? '✅' : '❌' }, userDetails);
          }
          break;
        }

        case BOT_ACTIONS.AUDIO: {
          const [challengeKey] = params;
          await ctx.replyWithChatAction('upload_voice');
          await this.audioHandler(chatId, messageId, challengeKey);
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.AUDIO }, userDetails);
          break;
        }

        case BOT_ACTIONS.LANGUAGE: {
          if (params.length === 0) {
            await this.languageHandler(ctx, chatId);
          } else {
            const selectedLanguage = params[0] as Language;
            await this.languageHandler(ctx, chatId, selectedLanguage);
            notify(BOT_CONFIG, { action: 'LANGUAGE_CHANGED', language: LANGUAGE_LABELS[selectedLanguage] }, userDetails);
          }
          await ctx.deleteMessage().catch(() => {});
          break;
        }

        case BOT_ACTIONS.DIFFICULTY: {
          if (params.length === 0) {
            await this.difficultyHandler(ctx, chatId);
          } else {
            const selectedDifficulty = parseInt(params[0]);
            await this.difficultyHandler(ctx, chatId, selectedDifficulty);
            notify(BOT_CONFIG, { action: 'DIFFICULTY_CHANGED', difficulty: DIFFICULTY_LABELS[selectedDifficulty] }, userDetails);
          }
          await ctx.deleteMessage().catch(() => {});
          break;
        }

        case BOT_ACTIONS.CONTACT:
          await this.contactHandler(ctx);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
          break;

        default:
          await ctx.answerCallbackQuery({ text: 'Unknown action' });
      }

      await ctx.answerCallbackQuery().catch(() => {});
    } catch (err) {
      this.logger.error(`Error handling callback query, ${err}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true });
    }
  }

  private async subscribeHandler(ctx: Context, chatId: number, userDetails: UserDetails): Promise<void> {
    await saveUserDetails(userDetails);
    await createUserPreference(chatId);

    const subscribeMessage = [
      '🎉 Success! You are now subscribed to daily Spanish challenges!',
      '',
      `📅 You'll receive challenges at ${DAILY_CHALLENGE_HOURS.join(' and ')}:00 every day.`,
      '',
      'Use /actions to manage your subscription.',
    ].join('\n');

    await ctx.reply(subscribeMessage);
  }

  private async unsubscribeHandler(ctx: Context, chatId: number): Promise<void> {
    await updateUserPreference(chatId, { isStopped: true });

    const unsubscribeMessage = [
      // br
      '👋 You have been unsubscribed from daily challenges.',
      '',
      'You can still use /challenge anytime to practice Spanish!',
      '',
      'Use /actions to subscribe again.',
    ].join('\n');

    await ctx.reply(unsubscribeMessage);
  }

  private async answerHandler(chatId: number, messageId: number, answerIndex: number, isCorrect: boolean): Promise<{ word: string; type: string; isCorrect: boolean } | null> {
    return await this.langlyService.handleAnswer(chatId, messageId, answerIndex, isCorrect);
  }

  private async audioHandler(chatId: number, messageId: number, challengeKey: string): Promise<void> {
    await this.langlyService.sendAudioPronunciation(chatId, messageId, challengeKey);
  }

  private async languageHandler(ctx: Context, chatId: number, selectedLanguage?: Language): Promise<void> {
    if (!selectedLanguage) {
      const keyboard = buildInlineKeyboard(Object.values(LANGUAGES).map((l) => ({ text: LANGUAGE_LABELS[l], data: [BOT_ACTIONS.LANGUAGE, l].join(INLINE_KEYBOARD_SEPARATOR) })));

      await ctx.reply('🌍 Select your preferred language:', { reply_markup: keyboard });
    } else {
      await updateUserPreference(chatId, { language: selectedLanguage });

      const confirmationMessage = [`✅ Language updated to: ${LANGUAGE_LABELS[selectedLanguage]}`, '', 'Your next challenges will be in this language!'].join('\n');

      await ctx.reply(confirmationMessage);
    }
  }

  private async difficultyHandler(ctx: Context, chatId: number, selectedDifficulty?: number): Promise<void> {
    if (!selectedDifficulty) {
      const keyboard = buildInlineKeyboard([
        { text: DIFFICULTY_LABELS[DifficultyLevel.BEGINNER], data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.BEGINNER].join(INLINE_KEYBOARD_SEPARATOR) },
        { text: DIFFICULTY_LABELS[DifficultyLevel.INTERMEDIATE], data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.INTERMEDIATE].join(INLINE_KEYBOARD_SEPARATOR) },
        { text: DIFFICULTY_LABELS[DifficultyLevel.ADVANCED], data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.ADVANCED].join(INLINE_KEYBOARD_SEPARATOR) },
        { text: DIFFICULTY_LABELS[DifficultyLevel.NATIVE], data: [BOT_ACTIONS.DIFFICULTY, DifficultyLevel.NATIVE].join(INLINE_KEYBOARD_SEPARATOR) },
      ]);

      await ctx.reply('📊 Select your difficulty level:', { reply_markup: keyboard });
    } else {
      await updateUserPreference(chatId, { difficulty: selectedDifficulty });

      const confirmationMessage = [`✅ Difficulty level updated to: ${DIFFICULTY_LABELS[selectedDifficulty]}`, '', 'Your next challenges will be at this difficulty level!'].join('\n');

      await ctx.reply(confirmationMessage);
    }
  }

  private async contactHandler(ctx: Context): Promise<void> {
    await ctx.reply(['Happy to help! 🤝', '', 'You can reach the creator at:', MY_USER_NAME].join('\n'));
  }
}
