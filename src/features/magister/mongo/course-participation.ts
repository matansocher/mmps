import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { CourseParticipation, CourseParticipationStatus, QuizAnswer, QuizQuestion, SummaryDetails } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<CourseParticipation>(DB_NAME, 'CourseParticipation');

export async function createCourseParticipation(chatId: number, courseId: string, totalLessons: number): Promise<CourseParticipation> {
  const participationCollection = getCollection();
  const participation: CourseParticipation = {
    _id: new ObjectId(),
    courseId,
    chatId,
    status: CourseParticipationStatus.Active,
    totalLessons,
    currentLesson: 1,
    lessonsCompleted: 0,
    isWaitingForNextLesson: false,
    assignedAt: new Date(),
    createdAt: new Date(),
  };
  await participationCollection.insertOne(participation);
  return participation;
}

export async function getActiveCourseParticipation(chatId: number): Promise<CourseParticipation | null> {
  const participationCollection = getCollection();
  return participationCollection.findOne({ chatId, status: CourseParticipationStatus.Active });
}

export async function getCourseParticipation(id: string): Promise<CourseParticipation | null> {
  const participationCollection = getCollection();
  return participationCollection.findOne({ _id: new ObjectId(id) });
}

export async function getCourseParticipations(): Promise<CourseParticipation[]> {
  const participationCollection = getCollection();
  return participationCollection.find({}).toArray();
}

export async function updatePreviousResponseId(participationId: string, responseId: string): Promise<void> {
  const participationCollection = getCollection();
  await participationCollection.updateOne({ _id: new ObjectId(participationId) }, { $set: { previousResponseId: responseId } });
}

export async function markLessonCompleted(participationId: string): Promise<CourseParticipation> {
  const participationCollection = getCollection();
  const participation = await getCourseParticipation(participationId);

  const update = {
    $set: {
      lessonsCompleted: participation.lessonsCompleted + 1,
      lastLessonCompletedAt: new Date(),
      isWaitingForNextLesson: true,
    },
  };

  await participationCollection.updateOne({ _id: new ObjectId(participationId) }, update);
  return getCourseParticipation(participationId);
}

export async function markLessonSent(participationId: string): Promise<void> {
  const participationCollection = getCollection();
  const participation = await getCourseParticipation(participationId);

  await participationCollection.updateOne(
    { _id: new ObjectId(participationId) },
    {
      $set: {
        currentLesson: participation.currentLesson + 1,
        isWaitingForNextLesson: false,
      },
    },
  );
}

export async function markCourseParticipationCompleted(participationId: string): Promise<CourseParticipation> {
  const participationCollection = getCollection();
  await participationCollection.updateOne(
    { _id: new ObjectId(participationId) },
    {
      $set: {
        status: CourseParticipationStatus.Completed,
        completedAt: new Date(),
      },
    },
  );
  return getCourseParticipation(participationId);
}

export async function saveMessageId(participationId: string, messageId: number): Promise<void> {
  const participationCollection = getCollection();
  await participationCollection.updateOne({ _id: new ObjectId(participationId) }, { $push: { threadMessages: messageId } });
}

export async function saveCourseSummary(participation: CourseParticipation, topicTitle: string, summary: Omit<SummaryDetails, 'topicTitle' | 'createdAt'>): Promise<void> {
  const participationCollection = getCollection();
  const summaryDetails: SummaryDetails = {
    topicTitle,
    ...summary,
    createdAt: new Date(),
  };
  await participationCollection.updateOne({ _id: participation._id }, { $set: { summaryDetails } });
}

export async function saveSummarySent(participationId: string): Promise<void> {
  const participationCollection = getCollection();
  await participationCollection.updateOne({ _id: new ObjectId(participationId) }, { $set: { 'summaryDetails.sentAt': new Date() } });
}

export async function getParticipationsReadyForNextLesson(): Promise<CourseParticipation[]> {
  const participationCollection = getCollection();

  return participationCollection
    .find({
      status: CourseParticipationStatus.Active,
      isWaitingForNextLesson: true,
      $expr: { $lt: ['$currentLesson', { $add: ['$totalLessons', 1] }] },
    })
    .toArray();
}

export async function saveQuizQuestions(participationId: string, questions: QuizQuestion[]): Promise<void> {
  const participationCollection = getCollection();
  const filter = { _id: new ObjectId(participationId) };
  const updateObj = { $set: { quizDetails: { questions, answers: [], startedAt: new Date() } } };
  await participationCollection.updateOne(filter, updateObj);
}

export async function saveQuizAnswer(participationId: string, answer: QuizAnswer): Promise<void> {
  const participationCollection = getCollection();
  const filter = { _id: new ObjectId(participationId) };
  const updateObj = { $push: { 'quizDetails.answers': answer } };
  await participationCollection.updateOne(filter, updateObj);
}

export async function updateQuizScore(participationId: string, score: number): Promise<void> {
  const participationCollection = getCollection();
  const filter = { _id: new ObjectId(participationId) };
  const updateObj = { $set: { 'quizDetails.score': score, 'quizDetails.completedAt': new Date() } };
  await participationCollection.updateOne(filter, updateObj);
}
