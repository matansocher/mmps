import { Collection, Db, ObjectId } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { Course, CourseParticipation, CourseParticipationStatus, SummaryDetails } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

const NUM_OD_DAYS_TO_SUMMARY_REMINDER = 14;

let db: Db;
let courseParticipationCollection: Collection<CourseParticipation>;

(async () => {
  db = await getMongoDb(DB_NAME);
  courseParticipationCollection = getMongoCollection<CourseParticipation>(db, COLLECTIONS.COURSE_PARTICIPATION);
})();

export async function createCourseParticipation(chatId: number, courseId: string): Promise<CourseParticipation> {
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

export function getCourseParticipation(courseParticipationId: string): Promise<CourseParticipation> {
  const filter = { _id: new ObjectId(courseParticipationId) };
  return this.courseParticipationCollection.findOne(filter);
}

export function getCourseParticipations(chatId: number): Promise<CourseParticipation[]> {
  const filter = { chatId };
  return this.courseParticipationCollection.find(filter).toArray();
}

export function getActiveCourseParticipation(chatId: number): Promise<CourseParticipation> {
  const filter = { chatId, status: CourseParticipationStatus.Assigned };
  return this.courseParticipationCollection.findOne(filter);
}

export async function markCourseParticipationLessonCompleted(id: ObjectId): Promise<void> {
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

export async function markCourseParticipationCompleted(courseParticipationId: string): Promise<CourseParticipation | null> {
  const filter = { _id: new ObjectId(courseParticipationId) };
  const updateObj = {
    $set: {
      status: CourseParticipationStatus.Completed,
      completedAt: new Date(),
    },
  };
  return this.courseParticipationCollection.findOneAndUpdate(filter, updateObj, { returnDocument: 'after' });
}

export async function updatePreviousResponseId(courseParticipationId: string, previousResponseId: string): Promise<void> {
  const filter = { _id: new ObjectId(courseParticipationId) };
  const updateObj = {
    $set: {
      previousResponseId,
    },
  };
  await this.courseParticipationCollection.updateOne(filter, updateObj);
}

export async function saveMessageId(courseParticipationId: string, messageId: number): Promise<void> {
  const filter = { _id: new ObjectId(courseParticipationId) };
  const updateObj = { $push: { threadMessages: messageId } };
  await this.courseParticipationCollection.updateOne(filter, updateObj);
}

export async function saveCourseSummary(courseParticipation: CourseParticipation, topicTitle: string, summaryDetails: Pick<SummaryDetails, 'summary' | 'keyTakeaways'>): Promise<void> {
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

export async function saveSummarySent(id: string): Promise<void> {
  const filter = { _id: new ObjectId(id) };
  const updateObj = {
    $set: {
      'summaryDetails.sentAt': new Date(),
    },
  };
  await this.courseParticipationCollection.updateOne(filter, updateObj);
}

export async function getCourseParticipationForSummaryReminder(): Promise<CourseParticipation> {
  const filter = {
    status: CourseParticipationStatus.Completed,
    summaryDetails: { $exists: true },
    'summaryDetails.sentAt': { $exists: false },
    completedAt: { $lt: new Date(Date.now() - NUM_OD_DAYS_TO_SUMMARY_REMINDER * 24 * 60 * 60 * 1000) },
  };
  return this.courseParticipationCollection.findOne(filter);
}
