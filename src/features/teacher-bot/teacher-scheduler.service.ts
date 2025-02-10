import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY, COURSE_START_HOUR_OF_DAY } from './teacher-bot.config';
import { TeacherService } from './teacher.service';

@Injectable()
export class TeacherSchedulerService {
  constructor(private readonly teacherService: TeacherService) {}

  @Cron(`0 ${COURSE_START_HOUR_OF_DAY} * * *`, { name: 'teacher-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleCourseFirstLesson(): Promise<void> {
    const chatIds = [MY_USER_ID];
    await Promise.all(chatIds.map((chatId) => this.teacherService.processCourseFirstLesson(chatId)));
  }

  @Cron(`0 ${COURSE_ADDITIONAL_LESSONS_HOURS_OF_DAY.join(',')} * * *`, {
    name: 'teacher-scheduler-next',
    timeZone: DEFAULT_TIMEZONE,
  })
  async handleCourseNextLesson(): Promise<void> {
    const chatIds = [MY_USER_ID];
    await Promise.all(chatIds.map((chatId) => this.teacherService.processCourseNextLesson(chatId)));
  }
}
