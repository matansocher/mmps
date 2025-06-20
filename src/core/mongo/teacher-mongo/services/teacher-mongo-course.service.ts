import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { Course } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../teacher-mongo.config';

@Injectable()
export class TeacherMongoCourseService {
  private readonly courseCollection: Collection<Course>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.courseCollection = this.db.collection(COLLECTIONS.COURSE);
  }

  async createCourse(chatId: number, topic: string): Promise<Course> {
    const course: Course = {
      _id: new ObjectId(),
      topic,
      createdBy: chatId,
      createdAt: new Date(),
    };
    await this.courseCollection.insertOne(course);
    return course;
  }

  async getRandomCourse(chatId: number, excludedCourses: string[]): Promise<Course | null> {
    const filter = {
      _id: { $nin: excludedCourses.map((courseId) => new ObjectId(courseId)) },
      $or: [
        { createdBy: chatId }, // Courses created by the user
        { createdBy: { $exists: false } }, // Courses without createdBy field
      ],
    };
    const results = await this.courseCollection
      .aggregate<Course>([
        { $match: filter },
        { $sample: { size: 1 } }, // Get a random course
      ])
      .toArray();
    return results[0] || null;
  }
}
