import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { TeacherService } from '@services/teacher';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { LESSONS_HOURS_OF_DAY } from './teacher-bot.config';

@Injectable()
export class TeacherSchedulerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly teacherService: TeacherService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${LESSONS_HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async startLesson(): Promise<void> {
    try {
      await this.teacherService.processLesson();
    } catch (err) {
      this.logger.error(this.startLesson.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `Error in lesson part: ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
