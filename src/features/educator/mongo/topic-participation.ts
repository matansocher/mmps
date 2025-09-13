import { Collection, Db, ObjectId } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { SummaryDetails, Topic, TopicParticipation, TopicParticipationStatus } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

const NUM_OD_DAYS_TO_SUMMARY_REMINDER = 14;

let db: Db;
let topicParticipationCollection: Collection<TopicParticipation>;

(async () => {
  db = await getMongoDb(DB_NAME);
  topicParticipationCollection = getMongoCollection<TopicParticipation>(db, COLLECTIONS.TOPIC_PARTICIPATION);
})();

export async function createTopicParticipation(chatId: number, topicId: string): Promise<TopicParticipation> {
  const topicParticipation: TopicParticipation = {
    _id: new ObjectId(),
    topicId,
    chatId,
    status: TopicParticipationStatus.Assigned,
    assignedAt: new Date(),
    createdAt: new Date(),
  };
  await this.topicParticipationCollection.insertOne(topicParticipation);
  return topicParticipation;
}

export function getTopicParticipation(topicParticipationId: string): Promise<TopicParticipation> {
  const filter = { _id: new ObjectId(topicParticipationId) };
  return this.topicParticipationCollection.findOne(filter);
}

export function getTopicParticipations(chatId: number): Promise<TopicParticipation[]> {
  const filter = { chatId };
  return this.topicParticipationCollection.find(filter).toArray();
}

export function getActiveTopicParticipation(chatId: number): Promise<TopicParticipation> {
  const filter = { chatId, status: TopicParticipationStatus.Assigned };
  return this.topicParticipationCollection.findOne(filter);
}

export async function markTopicParticipationCompleted(topicParticipationId: string): Promise<TopicParticipation | null> {
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $set: {
      status: TopicParticipationStatus.Completed,
      completedAt: new Date(),
    },
  };
  return this.topicParticipationCollection.findOneAndUpdate(filter, updateObj, { returnDocument: 'after' });
}

export async function updatePreviousResponseId(topicParticipationId: string, previousResponseId: string): Promise<void> {
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $set: {
      previousResponseId,
    },
  };
  await this.topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveMessageId(topicParticipationId: string, messageId: number): Promise<void> {
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = { $push: { threadMessages: messageId } };
  await this.topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveTopicSummary(topicParticipation: TopicParticipation, topicTitle: string, summaryDetails: Pick<SummaryDetails, 'summary' | 'keyTakeaways'>): Promise<void> {
  const filter = { _id: new ObjectId(topicParticipation._id) };
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
  await this.topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveSummarySent(id: string): Promise<void> {
  const filter = { _id: new ObjectId(id) };
  const updateObj = {
    $set: {
      'summaryDetails.sentAt': new Date(),
    },
  };
  await this.topicParticipationCollection.updateOne(filter, updateObj);
}

export async function getCourseParticipationForSummaryReminder(): Promise<TopicParticipation> {
  const filter = {
    status: TopicParticipationStatus.Completed,
    summaryDetails: { $exists: true },
    'summaryDetails.sentAt': { $exists: false },
    completedAt: { $lt: new Date(Date.now() - NUM_OD_DAYS_TO_SUMMARY_REMINDER * 24 * 60 * 60 * 1000) },
  };
  return this.topicParticipationCollection.findOne(filter);
}
