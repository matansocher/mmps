import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { ChatbotService } from './chatbot.service';
import {
  birthdayReminder,
  dailySummary,
  earthquakeMonitor,
  exerciseReminder,
  footballUpdate,
  makavdiaUpdate,
  polymarketUpdate,
  // rainRadarAlert,
  reminderCheck,
  socialMediaUpdate,
  sportsCalendar,
  spotifyPodcastUpdate,
  upcomingEventAlert,
  usageSummary,
  weeklyExerciseSummary,
} from './schedulers';
import { LOOKBACK_MINUTES } from './schedulers/earthquake-monitor';

const logger = new Logger('ChatbotScheduler');

function createSchedule(expression: string, handler: () => Promise<void>, timezone: string = DEFAULT_TIMEZONE): void {
  cron.schedule(expression, () => handler().catch((err) => logger.error(`Scheduled task failed: ${err}`)), { timezone });
}

export class ChatbotSchedulerService {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    createSchedule(`00 23 * * *`, async () => dailySummary(this.bot, this.chatbotService));

    createSchedule(`00 18 * * *`, async () => birthdayReminder(this.bot));

    createSchedule(`59 12,23 * * *`, async () => footballUpdate(this.bot, this.chatbotService));

    createSchedule(`30 9 * * *`, async () => makavdiaUpdate(this.bot, this.chatbotService));

    createSchedule(`00 10 * * 0,3`, async () => sportsCalendar(this.bot, this.chatbotService));

    createSchedule(`0 19 * * *`, async () => exerciseReminder(this.bot, this.chatbotService));

    createSchedule(`0 22 * * 6`, async () => weeklyExerciseSummary(this.bot, this.chatbotService));

    createSchedule(`30 22 * * 6`, async () => usageSummary(this.bot));

    createSchedule(`*/15 * * * *`, async () => reminderCheck(this.bot));

    createSchedule(`*/15 * * * *`, async () => upcomingEventAlert(this.bot));

    createSchedule(`*/${LOOKBACK_MINUTES} * * * *`, async () => earthquakeMonitor(this.bot));

    createSchedule(`5 16 * * *`, async () => polymarketUpdate(this.bot));

    createSchedule(`6 9-22 * * *`, async () => spotifyPodcastUpdate(this.bot));

    createSchedule(`30 11,15,19,23 * * *`, async () => socialMediaUpdate(this.bot, ['twitter', 'youtube']));

    createSchedule(`30 18 * * *`, async () => socialMediaUpdate(this.bot, ['tiktok']));

    createSchedule(`30 11-23 * * *`, async () => socialMediaUpdate(this.bot, ['telegram']));

    // createSchedule(`11 9-23 * * *`, async () => rainRadarAlert(this.bot));
  }
}
