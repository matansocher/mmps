import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { BOTS } from '@services/telegram';
import {
  EXERCISE_ENCOURAGE_MESSAGES,
  EXERCISE_REPLY_MESSAGES,
  getLastWeekDates,
  getLongestStreak,
  getStreak,
  processMessageTemplate,
  SPECIAL_STREAKS_MESSAGES,
  WEEKLY_SUMMARY_MESSAGES,
} from './utils';

@Injectable()
export class TrainerService {
  constructor(
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  async getExercisesDates(chatId: number): Promise<Date[]> {
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    return exercises.map((exercise) => exercise.createdAt);
  }

  async processEODReminder(chatId: number): Promise<void> {
    const todayExercise = await this.mongoExerciseService.getTodayExercise(chatId);
    if (todayExercise) {
      return;
    }
    const exercisesDates = await this.getExercisesDates(chatId);
    const currentStreak = getStreak(exercisesDates);
    const template = EXERCISE_ENCOURAGE_MESSAGES[Math.floor(Math.random() * EXERCISE_ENCOURAGE_MESSAGES.length)];
    const replyText = processMessageTemplate(template, { currentStreak });
    await this.bot.sendMessage(chatId, replyText);
  }

  getExerciseReplyText({ currentStreak, longestStreak }): string {
    const specialSteaks = Object.keys(SPECIAL_STREAKS_MESSAGES);
    currentStreak = 7;
    if (specialSteaks.includes(`${currentStreak}`)) {
      const relevantMessages = SPECIAL_STREAKS_MESSAGES[currentStreak];
      const specialStreakTemplate = relevantMessages[Math.floor(Math.random() * relevantMessages.length)];
      return processMessageTemplate(specialStreakTemplate, { currentStreak });
    }
    const exerciseTemplate = EXERCISE_REPLY_MESSAGES[Math.floor(Math.random() * EXERCISE_REPLY_MESSAGES.length)];
    return processMessageTemplate(exerciseTemplate, { currentStreak, longestStreak });
  }

  async processWeeklySummary(chatId: number): Promise<void> {
    const { lastSunday, lastSaturday } = getLastWeekDates();

    const exercisesDates = await this.getExercisesDates(chatId);
    const lastWeekExercises = exercisesDates.filter((exerciseDate) => {
      return exerciseDate.getTime() > lastSunday.getTime() && exerciseDate.getTime() < lastSaturday.getTime();
    });
    const totalExercises = lastWeekExercises.length;
    const currentStreak = getStreak(lastWeekExercises);
    const longestStreak = getLongestStreak(exercisesDates);

    const template = WEEKLY_SUMMARY_MESSAGES[Math.floor(Math.random() * WEEKLY_SUMMARY_MESSAGES.length)];
    const summaryMessage = processMessageTemplate(template, { totalExercises, currentStreak, longestStreak });

    await this.bot.sendMessage(chatId, summaryMessage);
  }
}
