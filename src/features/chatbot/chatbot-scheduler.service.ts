import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { ChatbotService } from './chatbot.service';
import {
  dailySummary,
  earthquakeMonitor,
  exerciseReminder,
  footballUpdate,
  makavdiaUpdate,
  polymarketUpdate,
  rainRadarAlert,
  reminderCheck,
  sportsCalendar,
  weeklyExerciseSummary,
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
    createSchedule(`00 23 * * *`, async () => dailySummary(this.bot, this.chatbotService));

    createSchedule(`59 12,23 * * *`, async () => footballUpdate(this.bot, this.chatbotService));

    createSchedule(`30 9 * * *`, async () => makavdiaUpdate(this.bot, this.chatbotService));

    createSchedule(`00 10 * * 0,3`, async () => sportsCalendar(this.bot, this.chatbotService));

    createSchedule(`0 19 * * *`, async () => exerciseReminder(this.bot, this.chatbotService));

    createSchedule(`0 22 * * 6`, async () => weeklyExerciseSummary(this.bot, this.chatbotService));

    createSchedule(`15 * * * *`, async () => reminderCheck(this.bot));

    createSchedule(`*/${LOOKBACK_MINUTES} * * * *`, async () => earthquakeMonitor(this.bot));

    createSchedule(`5 16 * * *`, async () => polymarketUpdate(this.bot));

    createSchedule(`11 9-23 * * *`, async () => rainRadarAlert(this.bot));
  }
}
