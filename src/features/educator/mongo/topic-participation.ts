import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { QuizAnswer, QuizQuestion, SummaryDetails, TopicParticipation, TopicParticipationStatus } from '../types';
import { DB_NAME } from './index';

const NUM_OD_DAYS_TO_SUMMARY_REMINDER = 14;

const getCollection = () => getMongoCollection<TopicParticipation>(DB_NAME, 'TopicParticipation');

export async function createTopicParticipation(chatId: number, topicId: string): Promise<TopicParticipation> {
  const topicParticipationCollection = getCollection();
  const topicParticipation: TopicParticipation = {
    _id: new ObjectId(),
    topicId,
    chatId,
    status: TopicParticipationStatus.Assigned,
    assignedAt: new Date(),
    createdAt: new Date(),
  };
  await topicParticipationCollection.insertOne(topicParticipation);
  return topicParticipation;
}

export async function getTopicParticipation(topicParticipationId: string): Promise<TopicParticipation> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  return topicParticipationCollection.findOne(filter);
}

export async function getTopicParticipations(chatId: number): Promise<TopicParticipation[]> {
  const topicParticipationCollection = getCollection();
  const filter = { chatId };
  return topicParticipationCollection.find(filter).toArray();
}

export async function getActiveTopicParticipation(chatId: number): Promise<TopicParticipation> {
  const topicParticipationCollection = getCollection();
  const filter = { chatId, status: TopicParticipationStatus.Assigned };
  return topicParticipationCollection.findOne(filter);
}

export async function markTopicParticipationCompleted(topicParticipationId: string): Promise<TopicParticipation | null> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $set: {
      status: TopicParticipationStatus.Completed,
      completedAt: new Date(),
    },
  };
  return topicParticipationCollection.findOneAndUpdate(filter, updateObj, { returnDocument: 'after' });
}

export async function updatePreviousResponseId(topicParticipationId: string, previousResponseId: string): Promise<void> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $set: {
      previousResponseId,
    },
  };
  await topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveMessageId(topicParticipationId: string, messageId: number): Promise<void> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = { $push: { threadMessages: messageId } };
  await topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveTopicSummary(topicParticipation: TopicParticipation, topicTitle: string, summaryDetails: Pick<SummaryDetails, 'summary' | 'keyTakeaways'>): Promise<void> {
  const topicParticipationCollection = getCollection();
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
  await topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveSummarySent(id: string): Promise<void> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(id) };
  const updateObj = {
    $set: {
      'summaryDetails.sentAt': new Date(),
    },
  };
  await topicParticipationCollection.updateOne(filter, updateObj);
}

export async function getCourseParticipationForSummaryReminder(): Promise<TopicParticipation> {
  const topicParticipationCollection = getCollection();
  const filter = {
    status: TopicParticipationStatus.Completed,
    summaryDetails: { $exists: true },
    'summaryDetails.sentAt': { $exists: false },
    completedAt: { $lt: new Date(Date.now() - NUM_OD_DAYS_TO_SUMMARY_REMINDER * 24 * 60 * 60 * 1000) },
  };
  return topicParticipationCollection.findOne(filter);
}

export async function saveQuizQuestions(topicParticipationId: string, questions: QuizQuestion[]): Promise<void> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $set: {
      quizDetails: {
        questions,
        answers: [],
        startedAt: new Date(),
      },
    },
  };
  await topicParticipationCollection.updateOne(filter, updateObj);
}

export async function saveQuizAnswer(topicParticipationId: string, answer: QuizAnswer): Promise<void> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $push: {
      'quizDetails.answers': answer,
    },
  };
  await topicParticipationCollection.updateOne(filter, updateObj);
}

export async function updateQuizScore(topicParticipationId: string, score: number): Promise<void> {
  const topicParticipationCollection = getCollection();
  const filter = { _id: new ObjectId(topicParticipationId) };
  const updateObj = {
    $set: {
      'quizDetails.score': score,
      'quizDetails.completedAt': new Date(),
    },
  };
  await topicParticipationCollection.updateOne(filter, updateObj);
}
