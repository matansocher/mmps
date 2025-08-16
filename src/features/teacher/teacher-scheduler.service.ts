import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { TeacherMongoCourseParticipationService, TeacherMongoUserPreferencesService } from '@core/mongo/teacher-mongo';
import { NotifierService } from '@core/notifier';
import { getSummaryMessage } from '@features/teacher/utils';
import { BOT_CONFIG, COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY, COURSE_REMINDER_HOUR_OF_DAY, COURSE_START_HOUR_OF_DAY } from './teacher.config';
import { TeacherService } from './teacher.service';

@Injectable()
export class TeacherSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TeacherSchedulerService.name);

  constructor(
    private readonly teacherService: TeacherService,
    private readonly userPreferencesDB: TeacherMongoUserPreferencesService,
    private readonly courseParticipationDB: TeacherMongoCourseParticipationService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    // this.handleCourseFirstLesson();
    // this.handleCourseNextLesson();
  }

  @Cron(`0 ${COURSE_START_HOUR_OF_DAY} * * *`, { name: 'teacher-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleCourseFirstLesson(): Promise<void> {
    try {
      const users = await this.userPreferencesDB.getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.teacherService.processCourseFirstLesson(chatId)));
    } catch (err) {
      this.logger.error(`${this.handleCourseFirstLesson.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }

  @Cron(`0 ${COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY.join(',')} * * *`, {
    name: 'teacher-scheduler-next',
    timeZone: DEFAULT_TIMEZONE,
  })
  async handleCourseNextLesson(): Promise<void> {
    try {
      const users = await this.userPreferencesDB.getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.teacherService.processCourseNextLesson(chatId)));
    } catch (err) {
      this.logger.error(`${this.handleCourseNextLesson.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }

  @Cron(`0 ${COURSE_REMINDER_HOUR_OF_DAY} * * *`, { name: 'teacher-scheduler-reminders', timeZone: DEFAULT_TIMEZONE })
  async handleCourseReminders(): Promise<void> {
    try {
      // $$$$$$$$$$$$$$$$$$$$$$
      // const courseParticipationsForReminder = await this.courseParticipationDB.getCourseSummariesForReminder(3);
      const courseParticipationsForReminder = [];

      for (const { summary } of courseParticipationsForReminder) {
        await this.bot.sendMessage(summary.chatId, getSummaryMessage(summary), { parse_mode: 'Markdown' });
        await this.courseParticipationDB.saveSummarySent(summary._id.toString());
      }
    } catch (err) {
      this.logger.error(`${this.handleCourseReminders.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }
}
