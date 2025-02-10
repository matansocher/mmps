import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { SMART_REMINDER_HOUR_OF_DAY, WEEKLY_SUMMARY_HOUR_OF_DAY } from './trainer-bot.config';
import { TrainerService } from './trainer.service';

@Injectable()
export class TrainerSchedulerService {
  private readonly logger = new Logger(TrainerSchedulerService.name);

  constructor(
    private readonly trainerService: TrainerService,
    private readonly notifierBotService: NotifierBotService,
  ) {}

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'trainer-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleEODReminder(): Promise<void> {
    try {
      const chatIds = [MY_USER_ID];
      await Promise.all(chatIds.map((chatId) => this.trainerService.processEODReminder(chatId)));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleEODReminder.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }

  @Cron(`0 ${WEEKLY_SUMMARY_HOUR_OF_DAY} * * 6`, { name: 'trainer-weekly-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklySummary(): Promise<void> {
    try {
      const chatIds = [MY_USER_ID];
      await Promise.all(chatIds.map((chatId) => this.trainerService.processWeeklySummary(chatId)));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleWeeklySummary.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }
}
