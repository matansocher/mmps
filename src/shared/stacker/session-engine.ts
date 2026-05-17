import { ObjectId } from 'mongodb';
import { getDateString } from '@core/utils';
import {
  abandonActiveSessions,
  createSession,
  getActiveSession,
  getQuestionById,
  getStackerUser,
  logAnswer,
  sampleQuestions,
  updateSession,
  updateStackerUser,
  upsertStackerUser,
} from './mongo';
import {
  DAILY_HEARTS,
  Level,
  Question,
  QUESTION_TYPES,
  SESSION_SIZE,
  Session,
  StackerUser,
  Topic,
} from './types';

export const XP_PER_CORRECT = 20;

export type BeginSessionResult =
  | { ok: true; session: Session; user: StackerUser }
  | { ok: false; reason: 'out_of_hearts' | 'no_questions' };

export async function beginSession(
  chatId: number,
  telegramUserId: number,
  username: string | undefined,
  topic: Topic,
  level: Level,
): Promise<BeginSessionResult> {
  await abandonActiveSessions(chatId);
  const user = await ensureUserAndHearts(chatId, telegramUserId, username);
  if (user.heartsRemaining <= 0) return { ok: false, reason: 'out_of_hearts' };

  const questions = await sampleQuestions(topic, level, SESSION_SIZE);
  if (questions.length === 0) return { ok: false, reason: 'no_questions' };

  const queue = questions.map((q) => q._id!);
  const session = await createSession({
    chatId,
    topic,
    level,
    initialSize: queue.length,
    queue,
    retakeQueue: [],
    correctCount: 0,
    wrongCount: 0,
    status: 'active',
    startedAt: new Date(),
  });
  return { ok: true, session, user };
}

export type NextQuestionResult =
  | { complete: false; question: Question; session: Session;
      progress: { answered: number; remaining: number; total: number } }
  | { complete: true; session: Session };

export async function advanceToNextQuestion(session: Session): Promise<NextQuestionResult> {
  const queue = session.queue.slice();
  const retakeQueue = session.retakeQueue.slice();

  let nextId: ObjectId | undefined;
  if (queue.length > 0) nextId = queue.shift();
  else if (retakeQueue.length > 0) nextId = retakeQueue.shift();

  if (!nextId) return { complete: true, session };

  const question = await getQuestionById(nextId);
  if (!question) {
    await updateSession(session._id!, { queue, retakeQueue });
    return advanceToNextQuestion({ ...session, queue, retakeQueue });
  }

  await updateSession(session._id!, {
    queue, retakeQueue, currentQuestionId: question._id,
  });

  const answered = session.correctCount + session.wrongCount;
  const remaining = queue.length + retakeQueue.length + 1;
  const total = session.initialSize + session.wrongCount;
  return {
    complete: false,
    question,
    session: { ...session, queue, retakeQueue, currentQuestionId: question._id },
    progress: { answered, remaining, total },
  };
}

export type GradeResult = {
  correct: boolean;
  session: Session;
  user: StackerUser;
  outOfHearts: boolean;
  explanation: string;
  correctOptionIndex?: number;
  correctAnswer?: string;
};

export async function gradeAnswer(params: {
  chatId: number;
  sessionId: ObjectId;
  questionId: ObjectId;
  selectedOption?: number;
  text?: string;
}): Promise<GradeResult | null> {
  const session = await getActiveSession(params.chatId);
  if (!session || !session._id!.equals(params.sessionId)) return null;
  if (!session.currentQuestionId || !session.currentQuestionId.equals(params.questionId)) return null;

  const question = await getQuestionById(params.questionId);
  if (!question) return null;

  const correct = isAnswerCorrect(question, params);
  await logAnswer(params.chatId, session._id!, question._id!, correct);

  const retakeQueue = correct ? session.retakeQueue.slice() : [...session.retakeQueue, question._id!];
  const correctCount = correct ? session.correctCount + 1 : session.correctCount;
  const wrongCount = correct ? session.wrongCount : session.wrongCount + 1;
  await updateSession(session._id!, { retakeQueue, correctCount, wrongCount });

  let user = (await getStackerUser(params.chatId))!;
  let outOfHearts = false;
  if (!correct) {
    const heartsLeft = Math.max(0, user.heartsRemaining - 1);
    await updateStackerUser(params.chatId, { heartsRemaining: heartsLeft });
    user = { ...user, heartsRemaining: heartsLeft };
    if (heartsLeft <= 0) {
      await updateSession(session._id!, { status: 'abandoned', endedAt: new Date() });
      outOfHearts = true;
    }
  }

  return {
    correct,
    session: { ...session, retakeQueue, correctCount, wrongCount, status: outOfHearts ? 'abandoned' : 'active' },
    user,
    outOfHearts,
    explanation: question.explanation,
    correctOptionIndex: question.type === QUESTION_TYPES.FILL_IN ? undefined : question.correctOptionIndex,
    correctAnswer: question.type === QUESTION_TYPES.FILL_IN ? question.acceptedAnswers[0] : undefined,
  };
}

export type FinalizeResult = {
  xpEarned: number;
  totalXp: number;
  newStreak: number;
  streakChanged: boolean;
};

export async function finalizeSession(chatId: number, session: Session): Promise<FinalizeResult> {
  await updateSession(session._id!, { status: 'completed', endedAt: new Date() });
  const user = await getStackerUser(chatId);
  const xpEarned = session.correctCount * XP_PER_CORRECT;
  const { newStreak, isNewDay } = computeNewStreak(user?.streakCount ?? 0, user?.lastPlayedAt);
  const totalXp = (user?.xp ?? 0) + xpEarned;
  await updateStackerUser(chatId, { xp: totalXp, streakCount: newStreak, lastPlayedAt: new Date() });
  return { xpEarned, totalXp, newStreak, streakChanged: isNewDay };
}

export async function ensureUserAndHearts(
  chatId: number,
  telegramUserId: number,
  username: string | undefined,
): Promise<StackerUser> {
  const user = await upsertStackerUser(chatId, telegramUserId, username);
  const todayStr = getDateString();
  const lastResetStr = user.heartsResetAt ? getDateString(user.heartsResetAt) : null;
  if (lastResetStr !== todayStr) {
    const now = new Date();
    await updateStackerUser(chatId, { heartsRemaining: DAILY_HEARTS, heartsResetAt: now });
    return { ...user, heartsRemaining: DAILY_HEARTS, heartsResetAt: now };
  }
  return user;
}

export function normalizeFillInAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/^[`'"]+|[`'"]+$/g, '').trim();
}

export function isFillInCorrect(input: string, acceptedAnswers: readonly string[]): boolean {
  const normalized = normalizeFillInAnswer(input);
  return acceptedAnswers.some((a) => normalizeFillInAnswer(a) === normalized);
}

export function isAnswerCorrect(
  question: Question,
  params: { selectedOption?: number; text?: string },
): boolean {
  if (question.type === QUESTION_TYPES.FILL_IN) {
    return params.text !== undefined && isFillInCorrect(params.text, question.acceptedAnswers);
  }
  return params.selectedOption === question.correctOptionIndex;
}

export function computeNewStreak(
  currentStreak: number,
  lastPlayedAt: Date | undefined,
): { newStreak: number; isNewDay: boolean } {
  if (!lastPlayedAt) return { newStreak: 1, isNewDay: true };
  const todayStr = getDateString();
  const lastStr = getDateString(lastPlayedAt);
  if (lastStr === todayStr) return { newStreak: currentStreak, isNewDay: false };
  const dayDiff = Math.round(
    (Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastStr}T00:00:00Z`)) / 86_400_000,
  );
  if (dayDiff === 1) return { newStreak: currentStreak + 1, isNewDay: true };
  return { newStreak: 1, isNewDay: true };
}
