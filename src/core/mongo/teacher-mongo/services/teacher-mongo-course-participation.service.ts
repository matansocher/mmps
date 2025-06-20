import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { CourseParticipation, CourseParticipationStatus } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../teacher-mongo.config';

@Injectable()
export class TeacherMongoCourseParticipationService {
  private readonly courseParticipationCollection: Collection<CourseParticipation>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.courseParticipationCollection = this.db.collection(COLLECTIONS.COURSE_PARTICIPATION);
  }

  async createCourseParticipation(chatId: number, courseId: string, threadId: string): Promise<CourseParticipation> {
    const courseParticipation: CourseParticipation = {
      _id: new ObjectId(),
      courseId,
      chatId,
      threadId,
      status: CourseParticipationStatus.Assigned,
      assignedAt: new Date(),
      createdAt: new Date(),
    };
    await this.courseParticipationCollection.insertOne(courseParticipation);
    return courseParticipation;
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

  async markCourseParticipationCompleted(courseParticipationId: string): Promise<void> {
    const filter = { _id: new ObjectId(courseParticipationId) };
    const updateObj = {
      $set: {
        status: CourseParticipationStatus.Completed,
        completedAt: new Date(),
      },
    };
    await this.courseParticipationCollection.updateOne(filter, updateObj);
    return;
  }
}
