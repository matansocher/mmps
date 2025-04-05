import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DAYS_OF_WEEK, MY_USER_NAME } from '@core/config';
import { TrainerMongoExerciseService, TrainerMongoUserPreferencesService, TrainerMongoUserService } from '@core/mongo/trainer-mongo';
import { NotifierService } from '@core/notifier';
import { OpenaiService } from '@services/openai';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BROKEN_RECORD_IMAGE_PROMPT, TRAINER_BOT_COMMANDS } from './trainer.config';
import { BOT_ACTIONS } from './trainer.config';
import { getLastWeekDates, getLongestStreak, getSpecialNumber, getStreak } from './utils';

@Injectable()
export class TrainerBotService implements OnModuleInit {
  private readonly logger = new Logger(TrainerBotService.name);

  constructor(
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    private readonly mongoUserPreferencesService: TrainerMongoUserPreferencesService,
    private readonly mongoUserService: TrainerMongoUserService,
    private readonly openaiService: OpenaiService,
    private readonly notifier: NotifierService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(TRAINER_BOT_COMMANDS));
    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { ACTIONS, EXERCISE, ACHIEVEMENTS } = TRAINER_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: EXERCISE.command, handler: (message) => this.exerciseHandler.call(this, message) },
      { event: COMMAND, regex: ACHIEVEMENTS.command, handler: (message) => this.achievementsHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const userPreferences = await this.mongoUserPreferencesService.getUserPreference(chatId);
    const inlineKeyboardButtons = [
      userPreferences?.isStopped ? { text: '🟢 Start daily reminders 🟢', callback_data: `${BOT_ACTIONS.START}` } : { text: '🛑 Stop daily reminders 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 Contact 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '🏋️‍♂️ How can I help?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons) as any) });
  }

  private async exerciseHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    await this.mongoExerciseService.addExercise(chatId);

    const exercises = await this.mongoExerciseService.getExercises(chatId);
    const exercisesDates = exercises.map((exercise) => exercise.createdAt);
    const longestStreak = getLongestStreak(exercisesDates);

    const { lastSunday, lastSaturday } = getLastWeekDates();
    const lastWeekExercises = exercisesDates.filter((exerciseDate) => {
      return exerciseDate.getTime() > lastSunday.getTime() && exerciseDate.getTime() < lastSaturday.getTime();
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentStreak = getStreak([...exercisesDates, today]);

    this.notifier.notify(BOTS.TRAINER, { action: ANALYTIC_EVENT_NAMES.EXERCISE }, userDetails);

    // Check if the user broke their longest streak
    if (currentStreak > 1 && currentStreak > longestStreak) {
      await new MessageLoader(this.bot, chatId, { loaderEmoji: '🏋️‍♂️' }).handleMessageWithLoader(async () => {
        const caption = `🎉 Incredible! You've just broken your record and set a new streak - ${currentStreak} days in a row! 🏆🔥`;
        const generatedImage = await this.openaiService.createImage(BROKEN_RECORD_IMAGE_PROMPT.replace('{streak}', `${currentStreak}`));
        await this.bot.sendPhoto(chatId, generatedImage, { caption });
      });
      return;
    }
    await this.bot.sendMessage(chatId, `💪🔥`);
    await this.bot.sendMessage(
      chatId,
      [
        `💣 This Week Trainings: ${lastWeekExercises.length} (${lastWeekExercises.map((exerciseDate) => DAYS_OF_WEEK[exerciseDate.getDay()]).join(' ,')})`,
        `🚀 Current Streak: ${getSpecialNumber(currentStreak)}`,
        `💯 Longest Streak: ${getSpecialNumber(longestStreak)}`,
      ].join('\n'),
    );
  }

  private async achievementsHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    if (!exercises?.length) {
      await this.bot.sendMessage(chatId, 'I see you still did not exercise.\nGet going! 🤾');
      return;
    }

    const exercisesDates = exercises.map((exercise) => exercise.createdAt);
    const currentStreak = getStreak(exercisesDates);
    const longestStreak = getLongestStreak(exercisesDates);

    const replyText = [
      `🤾 Whole Life Total Exercises: ${getSpecialNumber(exercises.length)}`,
      `🚀 Current Streak: ${getSpecialNumber(currentStreak)}`,
      `💯 Longest Streak: ${getSpecialNumber(longestStreak)}`,
    ].join('\n');
    await this.bot.sendMessage(chatId, replyText);

    this.notifier.notify(BOTS.TRAINER, { action: ANALYTIC_EVENT_NAMES.ACHIEVEMENTS }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, userDetails, data: response } = getCallbackQueryData(callbackQuery);

    const [action] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.START:
        await this.startHandler(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId);
        this.notifier.notify(BOTS.TRAINER, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId);
        this.notifier.notify(BOTS.TRAINER, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId);
        this.notifier.notify(BOTS.TRAINER, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      default:
        this.notifier.notify(BOTS.TRAINER, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async startHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    const userExists = await this.mongoUserService.saveUserDetails(userDetails);
    const newUserReplyText = [`Hey There 👋`, `I am here to help you stay motivated with your exercises 🏋️‍♂️`].join('\n\n');
    const existingUserReplyText = `All set 💪`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(chatId: number): Promise<void> {
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
    const replyText = ['OK, I will stop reminding you for now 🛑', `Whenever you are ready, just send me the /start command and we will continue training`].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, [`Off course!, you can talk to the person who created me, he might be able to help 📬`, MY_USER_NAME].join('\n'));
  }
}
