import cron from 'node-cron';
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

export class ChatbotSchedulerService {
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    cron.schedule(
      `00 23 * * *`,
      async () => {
        await this.handleDailySummary();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `59 12,23 * * *`,
      async () => {
        await this.handleFootballUpdate();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `00 10 * * 0,3`,
      async () => {
        await this.handleSportsCalendar();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `0 19 * * *`,
      async () => {
        await this.handleExerciseReminder();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `0 22 * * 6`,
      async () => {
        await this.handleWeeklyExerciseSummary();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `15 * * * *`,
      async () => {
        await this.handleReminderCheck();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `*/${LOOKBACK_MINUTES} * * * *`,
      async () => {
        await this.handleEarthquakeMonitor();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `10 0,22,23 * * *`,
      async () => {
        await this.handleCokeQuitReminder();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `0 22 * * 6`,
      async () => {
        await this.handleCokeQuitWeeklySummary();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `0 0 * * *`,
      async () => {
        await this.handleCokeQuitStreakIncrement();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    setTimeout(() => {
      // this.handleDailySummary(); // for testing purposes
      // this.handleFootballUpdate(); // for testing purposes
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

  private async handleDailySummary(): Promise<void> {
    await dailySummary(this.bot, this.chatbotService);
  }

  private async handleFootballUpdate(): Promise<void> {
    await footballUpdate(this.bot, this.chatbotService);
  }

  private async handleSportsCalendar(): Promise<void> {
    await sportsCalendar(this.bot, this.chatbotService);
  }

  private async handleExerciseReminder(): Promise<void> {
    await exerciseReminder(this.bot, this.chatbotService);
  }

  private async handleWeeklyExerciseSummary(): Promise<void> {
    await weeklyExerciseSummary(this.bot, this.chatbotService);
  }

  private async handleReminderCheck(): Promise<void> {
    await reminderCheck(this.bot);
  }

  private async handleEarthquakeMonitor(): Promise<void> {
    await earthquakeMonitor(this.bot);
  }

  private async handleCokeQuitReminder(): Promise<void> {
    await cokeQuitReminder(this.bot, this.chatbotService);
  }

  private async handleCokeQuitWeeklySummary(): Promise<void> {
    await cokeQuitWeeklySummary(this.bot, this.chatbotService);
  }

  private async handleCokeQuitStreakIncrement(): Promise<void> {
    await cokeQuitStreakIncrement();
  }
}
