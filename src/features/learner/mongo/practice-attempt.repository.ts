import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { LEARNER_DB_NAME, LEARNER_PRACTICE_ATTEMPTS_COLLECTION } from '../constants';
import type { PracticeAnswerSource, PracticeAttempt, PracticeGrade, PracticeMessage, PracticeVerdict } from '../types';

const getCollection = () => getMongoCollection<PracticeAttempt>(LEARNER_DB_NAME, LEARNER_PRACTICE_ATTEMPTS_COLLECTION);

export async function ensurePracticeAttemptIndexes(): Promise<void> {
  await getCollection().createIndex({ telegramUserId: 1, createdAt: -1 });
}

const toObjectId = (id: string): ObjectId | null => (ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null);

export async function createPracticeAttempt(data: Omit<PracticeAttempt, '_id' | 'status' | 'messages' | 'createdAt'>): Promise<PracticeAttempt> {
  const doc: PracticeAttempt = { ...data, status: 'awaiting_answer', messages: [], createdAt: new Date() };
  const result = await getCollection().insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function getPracticeAttempt(telegramUserId: number, attemptId: string): Promise<PracticeAttempt | null> {
  const _id = toObjectId(attemptId);
  if (!_id) return null;
  return getCollection().findOne({ _id, telegramUserId });
}

// Only an ungraded attempt can be graded — returns null when another request already graded it.
export async function saveAttemptGrade(
  telegramUserId: number,
  attemptId: string,
  answer: string,
  answerSource: PracticeAnswerSource | undefined,
  grade: PracticeGrade,
): Promise<PracticeAttempt | null> {
  const _id = toObjectId(attemptId);
  if (!_id) return null;
  return getCollection().findOneAndUpdate(
    { _id, telegramUserId, status: 'awaiting_answer' },
    { $set: { status: 'graded', answer, ...(answerSource ? { answerSource } : {}), grade, gradedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function appendAttemptMessages(telegramUserId: number, attemptId: string, messages: readonly PracticeMessage[]): Promise<void> {
  const _id = toObjectId(attemptId);
  if (!_id) return;
  await getCollection().updateOne({ _id, telegramUserId }, { $push: { messages: { $each: [...messages] } } });
}

export async function getRecentQuestionIds(telegramUserId: number, limit: number): Promise<string[]> {
  const docs = await getCollection()
    .find({ telegramUserId }, { projection: { questionId: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => d.questionId);
}

export type ListAttemptsOptions = {
  readonly before?: Date;
  readonly limit: number;
  readonly verdict?: PracticeVerdict;
};

export async function listPracticeAttempts(telegramUserId: number, { before, limit, verdict }: ListAttemptsOptions): Promise<PracticeAttempt[]> {
  return getCollection()
    .find(
      {
        telegramUserId,
        status: 'graded',
        ...(before ? { createdAt: { $lt: before } } : {}),
        ...(verdict ? { 'grade.verdict': verdict } : {}),
      },
      { projection: { messages: 0 } },
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
