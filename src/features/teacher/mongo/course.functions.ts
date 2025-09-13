import { Collection, Db, ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Course } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let courseCollection: Collection<Course>;

(async () => {
  db = await getMongoDb(DB_NAME);
  courseCollection = getCollection<Course>(db, COLLECTIONS.COURSE);
})();

export async function createCourse(chatId: number, topic: string): Promise<Course> {
  const course: Course = {
    _id: new ObjectId(),
    topic,
    createdBy: chatId,
    createdAt: new Date(),
  };
  await courseCollection.insertOne(course);
  return course;
}

export async function getRandomCourse(chatId: number, excludedCourses: string[]): Promise<Course | null> {
  const filter = {
    _id: { $nin: excludedCourses.map((courseId) => new ObjectId(courseId)) },
    $or: [
      { createdBy: chatId }, // Courses created by the user
      { createdBy: { $exists: false } }, // Courses without createdBy field
    ],
  };
  const results = await courseCollection
    .aggregate<Course>([
      { $match: filter },
      { $sample: { size: 1 } }, // Get a random course
    ])
    .toArray();
  return results[0] || null;
}

export async function getCourse(id: string): Promise<Course> {
  const filter = { _id: new ObjectId(id) };
  return courseCollection.findOne(filter);
}
