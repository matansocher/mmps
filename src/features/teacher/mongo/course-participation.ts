import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { CourseParticipation, CourseParticipationStatus, SummaryDetails } from '../types';
import { DB_NAME } from './index';

const NUM_OD_DAYS_TO_SUMMARY_REMINDER = 14;

const getCollection = () => getMongoCollection<CourseParticipation>(DB_NAME, 'CourseParticipation');

export async function createCourseParticipation(chatId: number, courseId: string): Promise<CourseParticipation> {
  const courseParticipationCollection = getCollection();
  const courseParticipation: CourseParticipation = {
    _id: new ObjectId(),
    courseId,
    chatId,
    status: CourseParticipationStatus.Assigned,
    assignedAt: new Date(),
    createdAt: new Date(),
  };
  await courseParticipationCollection.insertOne(courseParticipation);
  return courseParticipation;
}

export async function getCourseParticipation(courseParticipationId: string): Promise<CourseParticipation> {
  const courseParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(courseParticipationId) };
  return courseParticipationCollection.findOne(filter);
}

export async function getCourseParticipations(chatId: number): Promise<CourseParticipation[]> {
  const courseParticipationCollection = getCollection();
  const filter = { chatId };
  return courseParticipationCollection.find(filter).toArray();
}

export async function getActiveCourseParticipation(chatId: number): Promise<CourseParticipation> {
  const courseParticipationCollection = getCollection();
  const filter = { chatId, status: CourseParticipationStatus.Assigned };
  return courseParticipationCollection.findOne(filter);
}

export async function markCourseParticipationLessonCompleted(id: ObjectId): Promise<void> {
  const courseParticipationCollection = getCollection();
  const filter = { _id: id };
  const courseParticipation = await courseParticipationCollection.findOne(filter);
  const lessonsCompleted = courseParticipation?.lessonsCompleted ? courseParticipation?.lessonsCompleted + 1 : 1;
  const updateObj = {
    $set: {
      status: CourseParticipationStatus.Assigned,
      lessonsCompleted,
    },
  };
  await courseParticipationCollection.updateOne(filter, updateObj);
  return;
}

export async function markCourseParticipationCompleted(courseParticipationId: string): Promise<CourseParticipation | null> {
  const courseParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(courseParticipationId) };
  const updateObj = {
    $set: {
      status: CourseParticipationStatus.Completed,
      completedAt: new Date(),
    },
  };
  return courseParticipationCollection.findOneAndUpdate(filter, updateObj, { returnDocument: 'after' });
}

export async function updatePreviousResponseId(courseParticipationId: string, previousResponseId: string): Promise<void> {
  const courseParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(courseParticipationId) };
  const updateObj = {
    $set: {
      previousResponseId,
    },
  };
  await courseParticipationCollection.updateOne(filter, updateObj);
}

export async function saveMessageId(courseParticipationId: string, messageId: number): Promise<void> {
  const courseParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(courseParticipationId) };
  const updateObj = { $push: { threadMessages: messageId } };
  await courseParticipationCollection.updateOne(filter, updateObj);
}

export async function saveCourseSummary(courseParticipation: CourseParticipation, topicTitle: string, summaryDetails: Pick<SummaryDetails, 'summary' | 'keyTakeaways'>): Promise<void> {
  const courseParticipationCollection = getCollection();
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
  await courseParticipationCollection.updateOne(filter, updateObj);
}

export async function saveSummarySent(id: string): Promise<void> {
  const courseParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(id) };
  const updateObj = {
    $set: {
      'summaryDetails.sentAt': new Date(),
    },
  };
  await courseParticipationCollection.updateOne(filter, updateObj);
}

export async function getCourseParticipationForSummaryReminder(): Promise<CourseParticipation> {
  const courseParticipationCollection = getCollection();
  const filter = {
    status: CourseParticipationStatus.Completed,
    summaryDetails: { $exists: true },
    'summaryDetails.sentAt': { $exists: false },
    completedAt: { $lt: new Date(Date.now() - NUM_OD_DAYS_TO_SUMMARY_REMINDER * 24 * 60 * 60 * 1000) },
  };
  return courseParticipationCollection.findOne(filter);
}
