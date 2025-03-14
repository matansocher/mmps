import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { TrainerMongoUserPreferencesService } from '@core/mongo/trainer-mongo';
import { SMART_REMINDER_HOUR_OF_DAY, WEEKLY_SUMMARY_HOUR_OF_DAY } from './trainer-bot.config';
import { TrainerService } from './trainer.service';

@Injectable()
export class TrainerSchedulerService implements OnModuleInit {
  constructor(
    private readonly trainerService: TrainerService,
    private readonly mongoUserPreferencesService: TrainerMongoUserPreferencesService,
  ) {}

  onModuleInit(): void {
    // this.handleEODReminder(); // for testing purposes
  }

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'trainer-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleEODReminder(): Promise<void> {
    const users = await this.mongoUserPreferencesService.getActiveUsers();
    const chatIds = users.map((user) => user.chatId);
    await Promise.all(chatIds.map((chatId) => this.trainerService.processEODReminder(chatId)));
  }

  @Cron(`0 ${WEEKLY_SUMMARY_HOUR_OF_DAY} * * 6`, { name: 'trainer-weekly-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklySummary(): Promise<void> {
    const users = await this.mongoUserPreferencesService.getActiveUsers();
    const chatIds = users.map((user) => user.chatId);
    await Promise.all(chatIds.map((chatId) => this.trainerService.processWeeklySummary(chatId)));
  }
}
