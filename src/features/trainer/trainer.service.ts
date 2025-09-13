import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DAYS_OF_WEEK } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getLongestStreak, getStars, getStreak } from '@core/utils';
import { searchMeme } from '@services/tenor';
import { getExercises, getTodayExercise, getUserDetails } from './mongo';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './trainer.config';
import { getLastWeekDates } from './utils';

export type AnalyticEventValue = (typeof ANALYTIC_EVENT_NAMES)[keyof typeof ANALYTIC_EVENT_NAMES];

@Injectable()
export class TrainerService {
  private readonly logger = new Logger(TrainerService.name);

  constructor(
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async processEODReminder(chatId: number): Promise<void> {
    try {
      const todayExercise = await getTodayExercise(chatId);
      if (todayExercise) {
        return;
      }
      const result = await searchMeme('funny lazy workout');
      if (result) {
        await this.bot.sendVideo(chatId, result);
      } else {
        await this.bot.sendMessage(chatId, '🦔🦔🦔🦔');
      }
    } catch (err) {
      this.logger.error(`${this.processEODReminder.name} - error: ${err}`);
      this.notifyWithUserDetails(chatId, ANALYTIC_EVENT_NAMES.DAILY_REMINDER_FAILED, `${err}`);
    }
  }

  async processWeeklySummary(chatId: number): Promise<void> {
    try {
      const { lastSunday, lastSaturday } = getLastWeekDates();

      const exercises = await getExercises(chatId);
      const exercisesDates = exercises.map((exercise) => exercise.createdAt);
      const lastWeekExercises = exercisesDates.filter((exerciseDate) => {
        return exerciseDate.getTime() > lastSunday.getTime() && exerciseDate.getTime() < lastSaturday.getTime();
      });
      const currentStreak = getStreak(lastWeekExercises);
      const longestStreak = getLongestStreak(exercisesDates);

      const exercisesDays = lastWeekExercises.map((exerciseDate) => `🟢 ${DAYS_OF_WEEK[exerciseDate.getDay()]}`);
      const exercisesDaysText = ['Last Week Exercises:', ...exercisesDays].join('\n');
      const streaksText = [`📅 This Week: ${getStars(lastWeekExercises.length)}`, `🚀 Current Streak: ${currentStreak}`, `🏋️‍♂️ Longest Streak: ${longestStreak}`].join('\n');
      const replyText = [streaksText, exercisesDaysText].join('\n\n');
      await this.bot.sendMessage(chatId, replyText);
    } catch (err) {
      this.logger.error(`${this.processWeeklySummary.name} - error: ${err}`);
      this.notifyWithUserDetails(chatId, ANALYTIC_EVENT_NAMES.WEEKLY_SUMMARY_FAILED, `${err}`);
    }
  }

  async notifyWithUserDetails(chatId: number, action: AnalyticEventValue, error?: string): Promise<void> {
    const userDetails = await getUserDetails(chatId);
    this.notifier.notify(BOT_CONFIG, { action, error }, userDetails);
  }
}
