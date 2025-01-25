import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { TeacherMongoCourseService, TeacherMongoUserPreferencesService } from '@core/mongo/teacher-mongo';
import { MY_USER_ID, NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { TeacherService } from './teacher.service';
import { COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY, COURSE_START_HOUR_OF_DAY } from './teacher-bot.config';

@Injectable()
export class TeacherSchedulerService {
  private readonly logger = new Logger(TeacherSchedulerService.name);

  constructor(
    private readonly teacherService: TeacherService,
    private readonly mongoCourseService: TeacherMongoCourseService,
    private readonly mongoUserPreferencesService: TeacherMongoUserPreferencesService,
    private readonly notifierBotService: NotifierBotService,
  ) {}

  @Cron(`0 ${COURSE_START_HOUR_OF_DAY} * * *`, { name: 'teacher-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleCourseFirstLesson(): Promise<void> {
    try {
      const userPreferences = await this.mongoUserPreferencesService.getUserPreference(MY_USER_ID);
      if (userPreferences?.isStopped) {
        return;
      }

      const activeCourse = await this.mongoCourseService.getActiveCourse();
      if (activeCourse) {
        return;
      }

      await this.teacherService.startNewCourse(MY_USER_ID);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleCourseFirstLesson.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }

  @Cron(`0 ${COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler-next', timeZone: DEFAULT_TIMEZONE })
  async handleCourseNextLesson(): Promise<void> {
    try {
      const userPreferences = await this.mongoUserPreferencesService.getUserPreference(MY_USER_ID);
      if (userPreferences?.isStopped) {
        return;
      }

      await this.teacherService.processLesson(MY_USER_ID, true);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleCourseNextLesson.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }
}
