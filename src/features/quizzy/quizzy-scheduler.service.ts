import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { QuizzyMongoSubscriptionService } from '@core/mongo/quizzy-mongo';
import { NotifierService } from '@core/notifier';
import { getHourInTimezone } from '@core/utils';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './quizzy.config';
import { QuizzyService } from './quizzy.service';

const INTERVAL_HOURS_BY_PRIORITY = [12, 17, 20];

@Injectable()
export class QuizzySchedulerService implements OnModuleInit {
  constructor(
    private readonly quizzyService: QuizzyService,
    private readonly subscriptionDB: QuizzyMongoSubscriptionService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`0 ${INTERVAL_HOURS_BY_PRIORITY.join(',')} * * *`, { name: 'quizzy-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await this.subscriptionDB.getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const chatIds = subscriptions.filter(({ chatId }) => getHourInTimezone(DEFAULT_TIMEZONE) === INTERVAL_HOURS_BY_PRIORITY[0] || chatId === MY_USER_ID).map(({ chatId }) => chatId);
      await Promise.all(chatIds.map(async (chatId) => this.quizzyService.scheduledGameHandler(chatId)));
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
