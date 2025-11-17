import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { provideTelegramBot } from '@services/telegram';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';
import {
  cokeQuitReminder,
  cokeQuitStreakIncrement,
  cokeQuitWeeklySummary,
  dailySummary,
  earthquakeMonitor,
  exerciseReminder,
  footballUpdate,
  reminderCheck,
  sportsCalendar,
  weeklyExerciseSummary,
} from './schedulers';
import { LOOKBACK_MINUTES } from './schedulers/earthquake-monitor';

@Injectable()
export class ChatbotSchedulerService implements OnModuleInit {
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly chatbotService: ChatbotService) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailySummary(); // for testing purposes
      // this.handleFootballUpdate(); // for testing purposes
      // this.handleFootballPredictionsResults(); // for testing purposes
      // this.handleFootballPredictions(); // for testing purposes
      // this.handleSportsCalendar(); // for testing purposes
      // this.handleExerciseReminder(); // for testing purposes
      // this.handleWeeklyExerciseSummary(); // for testing purposes
      // this.handleReminderCheck(); // for testing purposes
      // this.handleEarthquakeMonitor(); // for testing purposes
      // this.handleCokeQuitReminder(); // for testing purposes
      // this.handleCokeQuitWeeklySummary(); // for testing purposes
      // this.handleCokeQuitStreakIncrement(); // for testing purposes
    }, 8000);
  }

  @Cron(`00 23 * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    await dailySummary(this.bot, this.chatbotService);
  }

  @Cron(`59 12,23 * * *`, { name: 'chatbot-football-update-midday', timeZone: DEFAULT_TIMEZONE })
  async handleFootballUpdate(): Promise<void> {
    await footballUpdate(this.bot, this.chatbotService);
  }

  // @Cron(`00 13 * * *`, { name: 'chatbot-football-predictions', timeZone: DEFAULT_TIMEZONE })
  // async handleFootballPredictions(): Promise<void> {
  //   await footballPredictions(this.bot, this.chatbotService);
  // }

  // @Cron(`59 23 * * *`, { name: 'chatbot-football-update-evening', timeZone: DEFAULT_TIMEZONE })
  // async handleFootballPredictionsResults(): Promise<void> {
  //   await footballPredictionsResults(this.bot, this.chatbotService);
  // }

  @Cron(`00 10 * * 0,3`, { name: 'chatbot-important-games-calendar', timeZone: DEFAULT_TIMEZONE })
  async handleSportsCalendar(): Promise<void> {
    await sportsCalendar(this.bot, this.chatbotService);
  }

  @Cron(`0 19 * * *`, { name: 'chatbot-exercise-reminder', timeZone: DEFAULT_TIMEZONE })
  async handleExerciseReminder(): Promise<void> {
    await exerciseReminder(this.bot, this.chatbotService);
  }

  @Cron(`0 22 * * 6`, { name: 'chatbot-weekly-exercise-summary', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklyExerciseSummary(): Promise<void> {
    await weeklyExerciseSummary(this.bot, this.chatbotService);
  }

  @Cron(`15 * * * *`, { name: 'chatbot-reminder-check', timeZone: DEFAULT_TIMEZONE })
  async handleReminderCheck(): Promise<void> {
    await reminderCheck(this.bot);
  }

  @Cron(`*/${LOOKBACK_MINUTES} * * * *`, { name: 'chatbot-earthquake-monitor', timeZone: DEFAULT_TIMEZONE })
  async handleEarthquakeMonitor(): Promise<void> {
    await earthquakeMonitor(this.bot);
  }

  @Cron(`10 0,22,23 * * *`, { name: 'chatbot-coke-quit-reminder', timeZone: DEFAULT_TIMEZONE })
  async handleCokeQuitReminder(): Promise<void> {
    await cokeQuitReminder(this.bot, this.chatbotService);
  }

  @Cron(`0 22 * * 6`, { name: 'chatbot-coke-quit-weekly-summary', timeZone: DEFAULT_TIMEZONE })
  async handleCokeQuitWeeklySummary(): Promise<void> {
    await cokeQuitWeeklySummary(this.bot, this.chatbotService);
  }

  @Cron(`0 0 * * *`, { name: 'chatbot-coke-quit-streak-increment', timeZone: DEFAULT_TIMEZONE })
  async handleCokeQuitStreakIncrement(): Promise<void> {
    await cokeQuitStreakIncrement();
  }
}
