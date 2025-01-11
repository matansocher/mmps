import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { MY_USER_ID, NotifierBotService } from '@core/notifier-bot';
import { BOTS } from '@services/telegram';
import { TeacherService } from './teacher.service';
import { COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY, COURSE_START_HOUR_OF_DAY } from './teacher-bot.config';
import { getErrorMessage } from '@core/utils';

@Injectable()
export class TeacherSchedulerService {
  private readonly logger = new Logger(TeacherSchedulerService.name);

  constructor(
    private readonly teacherService: TeacherService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${COURSE_START_HOUR_OF_DAY} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleCourseFirstLesson(): Promise<void> {
    try {
      await this.teacherService.startNewCourse(MY_USER_ID);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(this.handleCourseFirstLesson.name, `error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH.name, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }

  @Cron(`0 ${COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleCourseNextLesson(): Promise<void> {
    try {
      await this.teacherService.processLesson(MY_USER_ID, true);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(this.handleCourseNextLesson.name, `error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH.name, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }
}
