import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MY_USER_ID } from '@core/config';
import { getActiveCourseParticipation, getCourse, getParticipationsReadyForNextLesson } from './mongo';
import { COURSE_LESSON_HOURS_OF_DAY, COURSE_REMINDER_HOUR_OF_DAY } from './scholar.config';
import { ScholarService } from './scholar.service';

@Injectable()
export class ScholarSchedulerService {
  private readonly logger = new Logger(ScholarSchedulerService.name);

  constructor(private readonly scholarService: ScholarService) {}

  @Cron(`0 ${COURSE_LESSON_HOURS_OF_DAY.join(',')} * * *`, { name: 'scholar-course-progression' })
  async handleCourseProgression(): Promise<void> {
    this.logger.log('Running scheduled: Course progression');

    try {
      const activeCourse = await getActiveCourseParticipation(MY_USER_ID);

      if (!activeCourse) {
        this.logger.log('Starting new course');
        await this.scholarService.startNewCourse(MY_USER_ID, false);
        return;
      }

      const readyParticipations = await getParticipationsReadyForNextLesson();
      const userParticipation = readyParticipations[0]; // Single user, so just get first

      if (userParticipation) {
        const course = await getCourse(userParticipation.courseId);
        this.logger.log(`Sending lesson ${userParticipation.currentLesson}/${userParticipation.totalLessons}`);
        await this.scholarService.sendLesson(MY_USER_ID, userParticipation, course);
      } else {
        this.logger.log('No lessons ready to send');
      }
    } catch (error) {
      this.logger.error(`Error in handleCourseProgression cron: ${error}`);
    }
  }

  @Cron(`0 ${COURSE_REMINDER_HOUR_OF_DAY} * * *`, { name: 'scholar-send-reminders' })
  async sendCourseReminders(): Promise<void> {
    this.logger.log('Running scheduled: Send course reminder');

    try {
      const activeCourse = await getActiveCourseParticipation(MY_USER_ID);

      if (activeCourse?.summaryDetails && !activeCourse.summaryDetails.sentAt) {
        this.logger.log('Sending course summary');
        await this.scholarService.handleCourseReminders(activeCourse);
      }
    } catch (error) {
      this.logger.error(`Error in sendCourseReminders cron: ${error}`);
    }
  }
}
