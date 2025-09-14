import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Course } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<Course>(DB_NAME, 'Course');

export async function createCourse(chatId: number, topic: string): Promise<Course> {
  const courseCollection = getCollection();
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
  const courseCollection = getCollection();
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
  const courseCollection = getCollection();
  const filter = { _id: new ObjectId(id) };
  return courseCollection.findOne(filter);
}
