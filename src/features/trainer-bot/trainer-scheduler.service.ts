import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { TrainerMongoUserPreferencesService } from '@core/mongo/trainer-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { SMART_REMINDER_HOUR_OF_DAY, WEEKLY_SUMMARY_HOUR_OF_DAY } from './trainer-bot.config';
import { TrainerService } from './trainer.service';

@Injectable()
export class TrainerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TrainerSchedulerService.name);

  constructor(
    private readonly trainerService: TrainerService,
    private readonly mongoUserPreferencesService: TrainerMongoUserPreferencesService,
    private readonly notifierBotService: NotifierBotService,
  ) {}

  onModuleInit(): void {
    // this.handleEODReminder(); // for testing purposes
  }

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'trainer-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleEODReminder(): Promise<void> {
    try {
      const users = await this.mongoUserPreferencesService.getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.trainerService.processEODReminder(chatId)));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleEODReminder.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.TRAINER, { action: 'ERROR', error: errorMessage });
    }
  }

  @Cron(`0 ${WEEKLY_SUMMARY_HOUR_OF_DAY} * * 6`, { name: 'trainer-weekly-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklySummary(): Promise<void> {
    try {
      const users = await this.mongoUserPreferencesService.getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.trainerService.processWeeklySummary(chatId)));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleWeeklySummary.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.TRAINER, { action: 'ERROR', error: errorMessage });
    }
  }
}
