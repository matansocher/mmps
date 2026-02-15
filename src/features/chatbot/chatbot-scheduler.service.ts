import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { ChatbotService } from './chatbot.service';
import {
  dailySummary,
  earthquakeMonitor,
  emailSummary,
  exerciseReminder,
  flightsUpdate,
  footballUpdate,
  makavdiaUpdate,
  polymarketUpdate,
  reminderCheck,
  sportsCalendar,
  weeklyExerciseSummary,
  youtubeCheck,
} from './schedulers';
import { LOOKBACK_MINUTES } from './schedulers/earthquake-monitor';

function createSchedule(expression: string, handler: () => Promise<void>, timezone: string = DEFAULT_TIMEZONE): void {
  cron.schedule(expression, handler, { timezone });
}

export class ChatbotSchedulerService {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    createSchedule(`00 23 * * *`, async () => {
      await this.handleDailySummary();
    });

    createSchedule(`59 12,23 * * *`, async () => {
      await this.handleFootballUpdate();
    });

    createSchedule(`30 9 * * *`, async () => {
      await this.handleMakavdiaUpdate();
    });

    createSchedule(`00 10 * * 0,3`, async () => {
      await this.handleSportsCalendar();
    });

    createSchedule(`0 19 * * *`, async () => {
      await this.handleExerciseReminder();
    });

    createSchedule(`0 22 * * 6`, async () => {
      await this.handleWeeklyExerciseSummary();
    });

    createSchedule(`35 23 * * *`, async () => {
      await this.handleEmailSummary();
    });

    createSchedule(`15 * * * *`, async () => {
      await this.handleReminderCheck();
    });

    createSchedule(`*/${LOOKBACK_MINUTES} * * * *`, async () => {
      await this.handleEarthquakeMonitor();
    });

    createSchedule(`5 12,16,23 * * *`, async () => {
      await this.handlePolymarketUpdate();
    });

    // createSchedule(`11 * * * *`, async () => {
    //   await this.handleFlightsUpdate();
    // });

    // createSchedule(`12 12,14,16,17,20,22,23 * * *`, async () => {
    //   await this.handleYoutubeCheck();
    // });

    setTimeout(() => {
      // this.handleDailySummary();
      // this.handleEmailSummary();
      // this.handleFootballUpdate();
      // this.handleMakavdiaUpdate();
      // this.handleSportsCalendar();
      // this.handleExerciseReminder();
      // this.handleWeeklyExerciseSummary();
      // this.handleReminderCheck();
      // this.handleEarthquakeMonitor();
      // this.handleYoutubeCheck();
      // this.handlePolymarketUpdate();
      // this.handleFlightsUpdate();
    }, 8000);
  }

  private async handleDailySummary(): Promise<void> {
    await dailySummary(this.bot, this.chatbotService);
  }

  private async handleEmailSummary(): Promise<void> {
    await emailSummary(this.bot, this.chatbotService);
  }

  private async handleFootballUpdate(): Promise<void> {
    await footballUpdate(this.bot, this.chatbotService);
  }

  private async handleMakavdiaUpdate(): Promise<void> {
    await makavdiaUpdate(this.bot, this.chatbotService);
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

  private async handleYoutubeCheck(): Promise<void> {
    await youtubeCheck(this.bot, this.chatbotService);
  }

  private async handlePolymarketUpdate(): Promise<void> {
    await polymarketUpdate(this.bot);
  }

  private async handleFlightsUpdate(): Promise<void> {
    await flightsUpdate(this.bot);
  }
}
