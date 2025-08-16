import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { EducatorMongoTopicParticipationService, EducatorMongoUserPreferencesService } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { getSummaryMessage } from '@features/educator/utils';
import { BOT_CONFIG, TOPIC_REMINDER_HOUR_OF_DAY, TOPIC_START_HOUR_OF_DAY } from './educator.config';
import { EducatorService } from './educator.service';

@Injectable()
export class EducatorSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EducatorSchedulerService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly userPreferencesDB: EducatorMongoUserPreferencesService,
    private readonly topicParticipationDB: EducatorMongoTopicParticipationService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    // this.handleTopic();
  }

  @Cron(`0 ${TOPIC_START_HOUR_OF_DAY} * * *`, {
    name: 'educator-scheduler-start',
    timeZone: DEFAULT_TIMEZONE,
  })
  async handleTopic(): Promise<void> {
    try {
      const users = await this.userPreferencesDB.getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.educatorService.processTopic(chatId)));
    } catch (err) {
      this.logger.error(`${this.handleTopic.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }

  @Cron(`0 ${TOPIC_REMINDER_HOUR_OF_DAY} * * *`, { name: 'educator-scheduler-reminders', timeZone: DEFAULT_TIMEZONE })
  async handleTopicReminders(): Promise<void> {
    try {
      // $$$$$$$$$$$$$$$$$$$$$$
      // const topicParticipationsForReminder = await this.topicParticipationDB.getTopicSummariesForReminder(3);
      const topicParticipationsForReminder = [];

      for (const { summary } of topicParticipationsForReminder) {
        await this.bot.sendMessage(summary.chatId, getSummaryMessage(summary), { parse_mode: 'Markdown' });
        await this.topicParticipationDB.saveSummarySent(summary._id.toString());
      }
    } catch (err) {
      this.logger.error(`${this.handleTopicReminders.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }
}
