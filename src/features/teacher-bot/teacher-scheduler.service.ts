import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { TeacherService } from '@services/teacher';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY, COURSE_START_HOUR_OF_DAY } from './teacher-bot.config';

@Injectable()
export class TeacherSchedulerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly teacherService: TeacherService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${COURSE_START_HOUR_OF_DAY} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleCourseFirstLesson(): Promise<void> {
    try {
      await this.teacherService.startNewCourse();
    } catch (err) {
      this.logger.error(this.handleCourseFirstLesson.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `error: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  @Cron(`0 ${COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleCourseNextLesson(): Promise<void> {
    try {
      await this.teacherService.processLesson(true);
    } catch (err) {
      this.logger.error(this.handleCourseNextLesson.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `error: ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
