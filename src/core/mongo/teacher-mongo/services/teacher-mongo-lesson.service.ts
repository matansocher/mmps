import { Collection, Db, ObjectId, UpdateFilter, UpdateResult, WithId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../teacher-mongo.config';
import { LessonModel, LessonStatus } from '../models/lesson.model';

@Injectable()
export class TeacherMongoLessonService {
  private readonly lessonCollection: Collection<LessonModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.lessonCollection = this.db.collection(COLLECTIONS.LESSON);
  }

  getRandomLesson(): Promise<WithId<LessonModel> | null> {
    const filter = { status: LessonStatus.Pending };
    return this.lessonCollection
      .aggregate<WithId<LessonModel>>([
        { $match: filter },
        { $sample: { size: 1 } }, // Get a random lesson
      ])
      .toArray()
      .then(results => results[0] || null); // Return the first result or null if none
  }

  getActiveLesson(): Promise<WithId<LessonModel>> {
    const filter = { status: LessonStatus.Assigned };
    return this.lessonCollection.findOne(filter) as Promise<WithId<LessonModel>>;
  }

  markLessonAsStarted(lessonId: ObjectId, additionalData: Partial<LessonModel>): Promise<UpdateResult<LessonModel>> {
    const filter = { _id: lessonId };
    const updateObj: UpdateFilter<LessonModel> = { $set: { status: LessonStatus.Assigned, assignedAt: new Date(), ...additionalData } };
    return this.lessonCollection.updateOne(filter, updateObj);
  }

  async markLessonPartCompleted(lessonId: ObjectId, maxLessonParts: number): Promise<UpdateResult<LessonModel>> {
    const filter = { _id: lessonId };
    const lesson = await this.lessonCollection.findOne(filter);
    const partsCompleted = lesson.partsCompleted ? lesson.partsCompleted + 1 : 1;
    const updateObj: UpdateFilter<LessonModel> = {
      $set: {
        status: LessonStatus.Assigned,
        assignedAt: new Date(),
        partsCompleted,
        ...(partsCompleted >= maxLessonParts && { status: LessonStatus.Completed, completedAt: new Date() }),
      },
    };
    return this.lessonCollection.updateOne(filter, updateObj);
  }
}
