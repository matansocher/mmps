import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { getDateString } from '@core/utils';
import { OpenaiService } from '@services/openai';
import { BOTS, getMessageData, handleCommand, MessageLoader, TelegramBotHandler } from '@services/telegram';
import { BROKEN_RECORD_IMAGE_PROMPT, INITIAL_BOT_RESPONSE, MAX_EXERCISES_HISTORY_TO_SHOW, TRAINER_BOT_COMMANDS } from './trainer-bot.config';
import { TrainerService } from './trainer.service';
import { generateExerciseReplyMessage, generateSpecialStreakMessage, getLongestStreak, getStreak } from './utils';

@Injectable()
export class TrainerBotService implements OnModuleInit {
  private readonly logger = new Logger(TrainerBotService.name);

  constructor(
    private readonly trainerService: TrainerService,
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    private readonly openaiService: OpenaiService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit() {
    this.bot.setMyCommands(Object.values(TRAINER_BOT_COMMANDS));
    const handlers: TelegramBotHandler[] = [
      { regex: TRAINER_BOT_COMMANDS.START.command, handler: this.startHandler },
      { regex: TRAINER_BOT_COMMANDS.EXERCISE.command, handler: this.exerciseHandler },
      { regex: TRAINER_BOT_COMMANDS.HISTORY.command, handler: this.historyHandler },
      { regex: TRAINER_BOT_COMMANDS.ACHIEVEMENTS.command, handler: this.achievementsHandler },
    ];
    const handleCommandOptions = { bot: this.bot, logger: this.logger, isBlocked: true };

    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), async (message: Message) => {
        await handleCommand({
          ...handleCommandOptions,
          message,
          handlerName: handler.name,
          handler: async () => handler.call(this, message),
        });
      });
    });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
  }

  private async exerciseHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🏋️‍♂️' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const exercisesDates = await this.trainerService.getExercisesDates(chatId);
      const longestStreak = getLongestStreak(exercisesDates);

      await this.mongoExerciseService.addExercise(chatId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentStreak = getStreak([...exercisesDates, today]);

      // Check if the user broke their longest streak
      if (currentStreak > 1 && currentStreak > longestStreak) {
        const caption = `🎉 Incredible! You've just broken your record and set a new streak - ${currentStreak} days in a row! 🏆🔥`;
        const generatedImage = await this.openaiService.createImage(BROKEN_RECORD_IMAGE_PROMPT.replace('{streak}', `${currentStreak}`));
        await this.bot.sendPhoto(chatId, generatedImage, { caption });
        return;
      }

      const replyText =
        generateSpecialStreakMessage(currentStreak) ||
        generateExerciseReplyMessage({
          currentStreak,
          longestStreak,
        });
      await this.bot.sendMessage(chatId, replyText);
    });
  }

  private async historyHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    if (!exercises?.length) {
      await this.bot.sendMessage(chatId, 'I see you still did not exercise.\nGet going! 🤾');
      return;
    }
    const messagePrefix = 'Exercises History';
    const sortedExercises = exercises.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latestExercises = sortedExercises.length > MAX_EXERCISES_HISTORY_TO_SHOW ? sortedExercises.slice(0, MAX_EXERCISES_HISTORY_TO_SHOW) : sortedExercises;
    const exercisesStr = latestExercises.map(({ createdAt }) => `${getDateString(createdAt)}`).join('\n');
    await this.bot.sendMessage(chatId, `${messagePrefix}:\n\n${exercisesStr}`);
  }

  private async achievementsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    if (!exercises?.length) {
      await this.bot.sendMessage(chatId, 'I see you still did not exercise.\nGet going! 🤾');
      return;
    }

    const currentStreak = getStreak(exercises.map((exercise) => exercise.createdAt));

    const replyText = [`Whole Life Total Exercises: ${exercises.length}`, `Current Streak: ${currentStreak}`].join('\n');
    await this.bot.sendMessage(chatId, replyText);
  }
}
