import { Collection, Db, ObjectId, UpdateResult, WithId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../teacher-mongo.config';
import { CourseModel, CourseStatus } from '../models/course.model';

@Injectable()
export class TeacherMongoCourseService {
  private readonly courseCollection: Collection<CourseModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.courseCollection = this.db.collection(COLLECTIONS.COURSE);
  }

  async getRandomCourse(): Promise<WithId<CourseModel> | null> {
    const filter = { status: CourseStatus.Pending };
    const results = await this.courseCollection
      .aggregate<WithId<CourseModel>>([
        { $match: filter },
        { $sample: { size: 1 } }, // Get a random course
      ])
      .toArray();
    return results[0] || null; // Return the first result or null if none
  }

  getActiveCourse(): Promise<WithId<CourseModel>> {
    const filter = { status: CourseStatus.Assigned };
    return this.courseCollection.findOne(filter) as Promise<WithId<CourseModel>>;
  }

  startCourse(courseId: ObjectId, additionalData: Partial<CourseModel>): Promise<UpdateResult<CourseModel>> {
    const filter = { _id: courseId };
    const updateObj = { $set: { status: CourseStatus.Assigned, assignedAt: new Date(), ...additionalData } };
    return this.courseCollection.updateOne(filter, updateObj);
  }

  async markCourseLessonCompleted(courseId: ObjectId): Promise<UpdateResult<CourseModel>> {
    const filter = { _id: courseId };
    const course = await this.courseCollection.findOne(filter);
    const lessonsCompleted = course.lessonsCompleted ? course.lessonsCompleted + 1 : 1;
    const updateObj = {
      $set: {
        status: CourseStatus.Assigned,
        lessonsCompleted,
      },
    };
    return this.courseCollection.updateOne(filter, updateObj);
  }

  async markActiveCourseCompleted(): Promise<UpdateResult<CourseModel>> {
    const updateObj = {
      $set: {
        status: CourseStatus.Completed,
        completedAt: new Date(),
      },
    };
    return this.courseCollection.updateMany({ status: CourseStatus.Assigned }, updateObj);
  }
}
