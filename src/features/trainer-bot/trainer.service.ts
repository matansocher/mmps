import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { DAYS_OF_WEEK } from '@core/config';
import { TrainerMongoExerciseService, TrainerMongoUserPreferencesService } from '@core/mongo/trainer-mongo';
import { BOTS } from '@services/telegram';
import { searchMeme } from '@services/tenor';
import { getLastWeekDates, getLongestStreak, getSpecialNumber, getStreak } from './utils';

@Injectable()
export class TrainerService {
  constructor(
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    private readonly mongoUserPreferencesService: TrainerMongoUserPreferencesService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  async processEODReminder(chatId: number): Promise<void> {
    const userPreferences = await this.mongoUserPreferencesService.getUserPreference(chatId);
    if (userPreferences?.isStopped) {
      return;
    }

    const todayExercise = await this.mongoExerciseService.getTodayExercise(chatId);
    if (todayExercise) {
      return;
    }
    const result = await searchMeme('funny lazy workout');
    if (result) {
      await this.bot.sendVideo(chatId, result);
    } else {
      await this.bot.sendMessage(chatId, '🦔🦔🦔🦔');
    }
  }

  async processWeeklySummary(chatId: number): Promise<void> {
    const userPreferences = await this.mongoUserPreferencesService.getUserPreference(chatId);
    if (userPreferences?.isStopped) {
      return;
    }

    const { lastSunday, lastSaturday } = getLastWeekDates();

    const exercises = await this.mongoExerciseService.getExercises(chatId);
    const exercisesDates = exercises.map((exercise) => exercise.createdAt);
    const lastWeekExercises = exercisesDates.filter((exerciseDate) => {
      return exerciseDate.getTime() > lastSunday.getTime() && exerciseDate.getTime() < lastSaturday.getTime();
    });
    const currentStreak = getStreak(lastWeekExercises);
    const longestStreak = getLongestStreak(exercisesDates);

    const exercisesDays = lastWeekExercises.map((exerciseDate) => `🟢 ${DAYS_OF_WEEK[exerciseDate.getDay()]}`);
    const exercisesDaysText = ['Last Week Exercises:', ...exercisesDays].join('\n');
    const streaksText = [`🚀 Current Streak: ${getSpecialNumber(currentStreak)}`, `🏋️‍♂️ Longest Streak: ${getSpecialNumber(longestStreak)}`].join('\n');
    const replyText = [streaksText, exercisesDaysText].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }
}
