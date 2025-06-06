import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { EducatorMongoUserPreferencesService } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { BOT_CONFIG, TOPIC_START_HOURS_OF_DAY } from './educator.config';
import { EducatorService } from './educator.service';

@Injectable()
export class EducatorSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EducatorSchedulerService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly userPreferencesDB: EducatorMongoUserPreferencesService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    // this.handleTopic();
  }

  @Cron(`0 ${TOPIC_START_HOURS_OF_DAY.join(',')} * * *`, {
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
}
