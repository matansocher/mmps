import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { EducatorMongoUserPreferencesService } from '@core/mongo/educator-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { BOTS } from '@services/telegram';
import { TOPIC_START_HOURS_OF_DAY } from './educator-bot.config';
import { EducatorService } from './educator.service';

@Injectable()
export class EducatorSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EducatorSchedulerService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly mongoUserPreferencesService: EducatorMongoUserPreferencesService,
    private readonly notifier: NotifierBotService,
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
      const users = await this.mongoUserPreferencesService.getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.educatorService.processTopic(chatId)));
    } catch (err) {
      this.logger.error(`${this.handleTopic.name} - error: ${err}`);
      this.notifier.notify(BOTS.EDUCATOR, { action: 'ERROR', error: `${err}` });
    }
  }
}
