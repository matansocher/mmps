import { ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Course } from '../models';
import { COLLECTIONS, DB_NAME } from '../teacher-mongo.config';

export async function createCourse(chatId: number, topic: string): Promise<Course> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Course>(db, COLLECTIONS.COURSE);

  const course: Course = {
    _id: new ObjectId(),
    topic,
    createdBy: chatId,
    createdAt: new Date(),
  };
  await collection.insertOne(course);
  return course;
}

export async function getRandomCourse(chatId: number, excludedCourses: string[]): Promise<Course | null> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Course>(db, COLLECTIONS.COURSE);

  const filter = {
    _id: { $nin: excludedCourses.map((courseId) => new ObjectId(courseId)) },
    $or: [
      { createdBy: chatId }, // Courses created by the user
      { createdBy: { $exists: false } }, // Courses without createdBy field
    ],
  };
  const results = await collection
    .aggregate<Course>([
      { $match: filter },
      { $sample: { size: 1 } }, // Get a random course
    ])
    .toArray();
  return results[0] || null;
}

export async function getCourse(id: string): Promise<Course> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Course>(db, COLLECTIONS.COURSE);

  const filter = { _id: new ObjectId(id) };
  return collection.findOne(filter);
}
