import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { getDateString, getErrorMessage } from '@core/utils';
import { BOTS, getMessageData, TelegramBotHandler } from '@services/telegram';
import { INITIAL_BOT_RESPONSE, MAX_EXERCISES_HISTORY_TO_SHOW, TRAINER_BOT_COMMANDS } from './trainer-bot.config';
import { TrainerService } from './trainer.service';
import { generateExerciseReplyMessage, getLongestStreak, getStreak } from './utils';

@Injectable()
export class TrainerBotService implements OnModuleInit {
  private readonly logger = new Logger(TrainerBotService.name);

  constructor(
    private readonly trainerService: TrainerService,
    private readonly mongoExerciseService: TrainerMongoExerciseService,
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
    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), async (message: Message) => {
        await this.handleCommand(message, handler.name, async () => handler.call(this, message));
      });
    });
  }

  private async handleCommand(message: Message, handlerName: string, handler: (chatId: number) => Promise<void>): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${handlerName} - ${logBody} - start`);
      await handler(chatId);
      this.logger.log(`${handlerName} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${handlerName} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
  }

  private async exerciseHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.mongoExerciseService.addExercise(chatId);

    const exercisesDates = await this.trainerService.getExercisesDates(chatId);
    const currentStreak = getStreak(exercisesDates);
    const longestStreak = getLongestStreak(exercisesDates);
    const replyText = generateExerciseReplyMessage({ currentStreak, longestStreak });
    await this.bot.sendMessage(chatId, replyText);
  }

  private async historyHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    if (!exercises?.length) {
      await this.bot.sendMessage(chatId, 'I see you still did not exercise.\nGet going! 🤾');
      return;
    }
    const messagePrefix = 'Exercises History';
    const latestExercises = exercises.length > MAX_EXERCISES_HISTORY_TO_SHOW ? exercises.slice(0, MAX_EXERCISES_HISTORY_TO_SHOW) : exercises;
    const exercisesStr = latestExercises
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(({ createdAt }) => `${getDateString(createdAt)}`)
      .join('\n');
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
