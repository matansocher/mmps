import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { TOPIC_START_HOURS_OF_DAY } from './educator-bot.config';
import { EducatorService } from './educator.service';

@Injectable()
export class EducatorSchedulerService {
  private readonly logger = new Logger(EducatorSchedulerService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly notifierBotService: NotifierBotService,
  ) {}

  @Cron(`0 ${TOPIC_START_HOURS_OF_DAY.join(',')} * * *`, {
    name: 'educator-scheduler-start',
    timeZone: DEFAULT_TIMEZONE,
  })
  async handleTopic(): Promise<void> {
    try {
      const chatIds = [MY_USER_ID];
      await Promise.all(chatIds.map((chatId) => this.educatorService.processTopic(chatId)));
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleTopic.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }
}
