import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { CourseParticipation, CourseParticipationStatus, SummaryDetails } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../teacher-mongo.config';

const NUM_OD_DAYS_TO_SUMMARY_REMINDER = 14;

@Injectable()
export class TeacherMongoCourseParticipationService {
  private readonly courseParticipationCollection: Collection<CourseParticipation>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.courseParticipationCollection = this.db.collection(COLLECTIONS.COURSE_PARTICIPATION);
  }

  async createCourseParticipation(chatId: number, courseId: string): Promise<CourseParticipation> {
    const courseParticipation: CourseParticipation = {
      _id: new ObjectId(),
      courseId,
      chatId,
      status: CourseParticipationStatus.Assigned,
      assignedAt: new Date(),
      createdAt: new Date(),
    };
    await this.courseParticipationCollection.insertOne(courseParticipation);
    return courseParticipation;
  }

  getCourseParticipation(courseParticipationId: string): Promise<CourseParticipation> {
    const filter = { _id: new ObjectId(courseParticipationId) };
    return this.courseParticipationCollection.findOne(filter);
  }

  getCourseParticipations(chatId: number): Promise<CourseParticipation[]> {
    const filter = { chatId };
    return this.courseParticipationCollection.find(filter).toArray();
  }

  getActiveCourseParticipation(chatId: number): Promise<CourseParticipation> {
    const filter = { chatId, status: CourseParticipationStatus.Assigned };
    return this.courseParticipationCollection.findOne(filter);
  }

  async markCourseParticipationLessonCompleted(id: ObjectId): Promise<void> {
    const filter = { _id: id };
    const courseParticipation = await this.courseParticipationCollection.findOne(filter);
    const lessonsCompleted = courseParticipation?.lessonsCompleted ? courseParticipation?.lessonsCompleted + 1 : 1;
    const updateObj = {
      $set: {
        status: CourseParticipationStatus.Assigned,
        lessonsCompleted,
      },
    };
    await this.courseParticipationCollection.updateOne(filter, updateObj);
    return;
  }

  async markCourseParticipationCompleted(courseParticipationId: string): Promise<CourseParticipation | null> {
    const filter = { _id: new ObjectId(courseParticipationId) };
    const updateObj = {
      $set: {
        status: CourseParticipationStatus.Completed,
        completedAt: new Date(),
      },
    };
    return this.courseParticipationCollection.findOneAndUpdate(filter, updateObj, { returnDocument: 'after' });
  }

  async updatePreviousResponseId(courseParticipationId: string, previousResponseId: string): Promise<void> {
    const filter = { _id: new ObjectId(courseParticipationId) };
    const updateObj = {
      $set: {
        previousResponseId,
      },
    };
    await this.courseParticipationCollection.updateOne(filter, updateObj);
  }

  async saveMessageId(courseParticipationId: string, messageId: number): Promise<void> {
    const filter = { _id: new ObjectId(courseParticipationId) };
    const updateObj = { $push: { threadMessages: messageId } };
    await this.courseParticipationCollection.updateOne(filter, updateObj);
  }

  async saveCourseSummary(courseParticipation: CourseParticipation, topicTitle: string, summaryDetails: Pick<SummaryDetails, 'summary' | 'keyTakeaways'>): Promise<void> {
    const filter = { _id: new ObjectId(courseParticipation._id) };
    const updateObj = {
      $set: {
        summaryDetails: {
          topicTitle,
          summary: summaryDetails.summary,
          keyTakeaways: summaryDetails.keyTakeaways,
          createdAt: new Date(),
        },
      },
    };
    await this.courseParticipationCollection.updateOne(filter, updateObj);
  }

  async saveSummarySent(id: string): Promise<void> {
    const filter = { _id: new ObjectId(id) };
    const updateObj = {
      $set: {
        'summaryDetails.sentAt': new Date(),
      },
    };
    await this.courseParticipationCollection.updateOne(filter, updateObj);
  }

  async getCourseParticipationForSummaryReminder(): Promise<CourseParticipation> {
    const filter = {
      status: CourseParticipationStatus.Completed,
      summaryDetails: { $exists: true },
      'summaryDetails.sentAt': { $exists: false },
      completedAt: { $lt: new Date(Date.now() - NUM_OD_DAYS_TO_SUMMARY_REMINDER * 24 * 60 * 60 * 1000) },
    };
    return this.courseParticipationCollection.findOne(filter);
  }
}
