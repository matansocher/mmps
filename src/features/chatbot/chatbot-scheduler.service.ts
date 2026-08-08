import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { ChatbotService } from './chatbot.service';
import {
  birthdayReminder,
  dailySummary,
  earthquakeMonitor,
  exerciseReminder,
  footballUpdate,
  hotelPriceCheck,
  makavdiaUpdate,
  polymarketUpdate,
  // rainRadarAlert,
  reminderCheck,
  secretaryCheckIn,
  secretaryDailyDigest,
  socialMediaCollect,
  socialMediaDigest,
  sportsCalendar,
  spotifyPodcastUpdate,
  transferCollect,
  transferDigest,
  upcomingEventAlert,
  usageSummary,
  weeklyExerciseSummary,
} from './schedulers';
import { LOOKBACK_MINUTES } from './schedulers/earthquake-monitor';
import type { SecretaryMessageService } from './secretary';

const logger = new Logger('chatbot:scheduler');

function createSchedule(expression: string, handler: () => Promise<void>, timezone: string = DEFAULT_TIMEZONE): void {
  const onError = (err: unknown) => logger.error(`Scheduled task failed: ${getErrorMessage(err)}`);
  cron.schedule(expression, () => handler().catch(onError), { timezone });
}

export class ChatbotSchedulerService {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
    private readonly secretaryMessageService: SecretaryMessageService,
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

    createSchedule(`30 11,15,19,23 * * *`, async () => socialMediaCollect(['twitter', 'youtube']));

    createSchedule(`30 18 * * *`, async () => socialMediaCollect(['tiktok']));

    createSchedule(`30 * * * *`, async () => socialMediaCollect(['telegram']));

    createSchedule(`45 22 * * *`, async () => socialMediaDigest(this.bot));

    createSchedule(`15 * * * *`, async () => transferCollect());

    createSchedule(`0 21 * * *`, async () => transferDigest(this.bot));

    createSchedule(`0 9 * * *`, async () => hotelPriceCheck(this.bot));

    createSchedule(`30 23 * * *`, async () => secretaryDailyDigest(this.bot, this.secretaryMessageService));

    createSchedule(`13 11 * * 1,2,3`, async () => secretaryCheckIn(this.bot, this.secretaryMessageService));

    // createSchedule(`11 9-23 * * *`, async () => rainRadarAlert(this.bot));
  }
}
