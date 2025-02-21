import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { getDateString } from '@core/utils';
import { OpenaiService } from '@services/openai';
import { BOTS, getMessageData, MessageLoader, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram/utils/register-handlers';
import { BROKEN_RECORD_IMAGE_PROMPT, INITIAL_BOT_RESPONSE, MAX_EXERCISES_HISTORY_TO_SHOW, TRAINER_BOT_COMMANDS } from './trainer-bot.config';
import { TrainerService } from './trainer.service';
import { getExerciseReplyText, getLongestStreak, getStreak } from './utils';

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
    const { COMMAND } = TELEGRAM_EVENTS;
    const { START, EXERCISE, HISTORY, ACHIEVEMENTS } = TRAINER_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: EXERCISE.command, handler: (message) => this.exerciseHandler.call(this, message) },
      { event: COMMAND, regex: HISTORY.command, handler: (message) => this.historyHandler.call(this, message) },
      {
        event: COMMAND,
        regex: ACHIEVEMENTS.command,
        handler: (message) => this.achievementsHandler.call(this, message),
      },
    ];
    registerHandlers({ bot: this.bot, logger: new Logger(BOTS.TRAINER.id), isBlocked: true, handlers });
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

      const replyText = getExerciseReplyText({ currentStreak, longestStreak });
      await this.bot.sendMessage(chatId, replyText);
    });
  }

  private async historyHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const exercises = await this.mongoExerciseService.getExercises(chatId, MAX_EXERCISES_HISTORY_TO_SHOW);
    if (!exercises?.length) {
      await this.bot.sendMessage(chatId, 'I see you still did not exercise.\nGet going! 🤾');
      return;
    }
    const exercisesStr = exercises.map(({ createdAt }) => `${getDateString(createdAt)}`).join('\n');
    await this.bot.sendMessage(chatId, `Exercises History:\n\n${exercisesStr}`);
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
