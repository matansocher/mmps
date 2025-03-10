import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { OpenaiService } from '@services/openai';
import { BOTS, getMessageData, MessageLoader, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram';
import { BROKEN_RECORD_IMAGE_PROMPT, TRAINER_BOT_COMMANDS } from './trainer-bot.config';
import { getLongestStreak, getSpecialNumber, getStreak } from './utils';

@Injectable()
export class TrainerBotService implements OnModuleInit {
  private readonly logger = new Logger(TrainerBotService.name);

  constructor(
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    private readonly openaiService: OpenaiService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(TRAINER_BOT_COMMANDS));
    const { COMMAND } = TELEGRAM_EVENTS;
    const { START, EXERCISE, ACHIEVEMENTS } = TRAINER_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: EXERCISE.command, handler: (message) => this.exerciseHandler.call(this, message) },
      { event: COMMAND, regex: ACHIEVEMENTS.command, handler: (message) => this.achievementsHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, isBlocked: true, handlers });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const replyText = [`Hey There 👋`, `I am here to help you stay motivated with your exercises 🏋️‍♂️`].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  private async exerciseHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const exercises = await this.mongoExerciseService.getExercises(chatId);
    const exercisesDates = exercises.map((exercise) => exercise.createdAt);
    const longestStreak = getLongestStreak(exercisesDates);

    await this.mongoExerciseService.addExercise(chatId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentStreak = getStreak([...exercisesDates, today]);

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
    await this.bot.sendMessage(chatId, [`🚀Current Streak: ${getSpecialNumber(currentStreak)}`, `💯Longest Streak: ${getSpecialNumber(longestStreak)}`].join('\n'));
  }

  private async achievementsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    if (!exercises?.length) {
      await this.bot.sendMessage(chatId, 'I see you still did not exercise.\nGet going! 🤾');
      return;
    }

    const exercisesDates = exercises.map((exercise) => exercise.createdAt);
    const currentStreak = getStreak(exercisesDates);
    const longestStreak = getLongestStreak(exercisesDates);

    const replyText = [`🤾Whole Life Total Exercises: ${exercises.length}`, `🚀Current Streak: ${currentStreak}`, `💯Longest Streak: ${longestStreak}`].join('\n');
    await this.bot.sendMessage(chatId, replyText);
  }
}
