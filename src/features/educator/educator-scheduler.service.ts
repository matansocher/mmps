import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { NotifierService } from '@core/notifier';
import { BOT_CONFIG, TOPIC_REMINDER_HOUR_OF_DAY, TOPIC_START_HOUR_OF_DAY } from './educator.config';
import { EducatorService } from './educator.service';
import { getActiveUsers, getCourseParticipationForSummaryReminder, getUserDetails } from './mongo';

@Injectable()
export class EducatorSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EducatorSchedulerService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    // this.handleTopic();
    // this.handleTopicReminders();
  }

  @Cron(`0 ${TOPIC_START_HOUR_OF_DAY} * * *`, {
    name: 'educator-scheduler-start',
    timeZone: DEFAULT_TIMEZONE,
  })
  async handleTopic(): Promise<void> {
    try {
      const users = await getActiveUsers();
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
      const topicParticipation = await getCourseParticipationForSummaryReminder();
      if (!topicParticipation) {
        return;
      }
      await this.educatorService.handleTopicReminders(topicParticipation).catch(async (err) => {
        const userDetails = await getUserDetails(topicParticipation.chatId);
        this.logger.error(`${this.handleTopicReminders.name} - error: ${err}`);
        this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}`, userDetails });
      });
    } catch (err) {
      this.logger.error(`${this.handleTopicReminders.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }
}
