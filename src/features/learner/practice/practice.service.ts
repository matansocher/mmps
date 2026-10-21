import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { getTranscriptFromBuffer } from '@services/openai';
import { CHAT_MODEL, CHAT_MODEL_REASONING_EFFORT } from '@services/openai/constants';
import { recordModelUsage, UsageCallbackHandler } from '@shared/ai';
import { toProgressDto } from '../api/dto';
import { PRACTICE_FUZZY_THRESHOLD, PRACTICE_MAX_FOLLOWUPS, PRACTICE_RECENT_WINDOW } from '../constants';
import { LEARNER_CATALOG } from '../learner-catalog';
import { LEARNER_LESSON_CONTEXT, LEARNER_QUESTIONS } from '../learner-questions';
import {
  appendAttemptMessages,
  applyRatingServerSide,
  createPracticeAttempt,
  getPracticeAttempt,
  getPracticeQuestionStats,
  getPracticeStats,
  getProgress,
  getRecentQuestionIds,
  type ListAttemptsOptions,
  listPracticeAttempts,
  practiceStatsId,
  saveAttemptGrade,
  savePracticeQuestionStats,
} from '../mongo';
import type { LearnerProgress, LearnerProgressDocument, LearnerQuestion, PracticeAnswerSource, PracticeAttempt, PracticeGrade, PracticeScope } from '../types';
import { finalizeGrade, isNonAnswer, nextQuestionStats, skippedGrade } from './practice-grading';
import { buildGraderInput, buildTutorPrompt, GRADER_PROMPT, gradeSchema } from './practice-prompts';
import { filterQuestionsByScope, selectQuestion } from './practice-selection';
import { type PracticeScopeResponse, toScopeResponse } from './practice.dto';

const QUESTIONS_BY_ID = new Map(LEARNER_QUESTIONS.map((q) => [q.id, q]));
const REFERENCE_BITES = new Set(LEARNER_CATALOG.filter((b) => b.isReference).map((b) => b.id));
const TUTOR_HISTORY_LIMIT = 20;

export class PracticeError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

export type GradedAttempt = {
  readonly attempt: PracticeAttempt;
  readonly progress?: LearnerProgress;
};

export class PracticeService {
  private readonly logger = new Logger('learner:practice');
  private readonly grader: ChatOpenAI;
  private readonly tutor: ChatOpenAI;

  constructor() {
    this.grader = new ChatOpenAI({ model: CHAT_MODEL, reasoning: { effort: CHAT_MODEL_REASONING_EFFORT }, temperature: 0, apiKey: env.OPENAI_API_KEY, timeout: 60_000 });
    this.tutor = new ChatOpenAI({ model: CHAT_MODEL, reasoning: { effort: CHAT_MODEL_REASONING_EFFORT }, temperature: 0.4, apiKey: env.OPENAI_API_KEY, timeout: 90_000 });
  }

  async getScope(telegramUserId: number): Promise<PracticeScopeResponse> {
    const stats = await getPracticeStats(telegramUserId);
    return toScopeResponse(stats, new Date());
  }

  async startAttempt(telegramUserId: number, scope: PracticeScope): Promise<PracticeAttempt> {
    const needsReadFilter = scope.kind !== 'lessons' && scope.readOnly;
    const [stats, recentQuestionIds, progress] = await Promise.all([
      getPracticeStats(telegramUserId),
      getRecentQuestionIds(telegramUserId, PRACTICE_RECENT_WINDOW),
      needsReadFilter ? getProgress(telegramUserId) : Promise.resolve<LearnerProgressDocument | null>(null),
    ]);
    const readBiteIds = needsReadFilter
      ? new Set(
          Object.entries(progress?.states ?? {})
            .filter(([, state]) => state.readAt)
            .map(([biteId]) => biteId),
        )
      : undefined;
    const pool = filterQuestionsByScope(LEARNER_QUESTIONS, scope, readBiteIds);
    const question = selectQuestion({ pool, stats, recentQuestionIds, now: new Date() });
    if (!question) throw new PracticeError(needsReadFilter ? 'no_read_lessons' : 'no_questions', 422);
    return createPracticeAttempt({ telegramUserId, questionId: question.id, biteId: question.biteId, scope });
  }

  async getAttempt(telegramUserId: number, attemptId: string): Promise<PracticeAttempt> {
    const attempt = await getPracticeAttempt(telegramUserId, attemptId);
    if (!attempt) throw new PracticeError('attempt_not_found', 404);
    return attempt;
  }

  async listAttempts(telegramUserId: number, options: ListAttemptsOptions): Promise<PracticeAttempt[]> {
    return listPracticeAttempts(telegramUserId, options);
  }

  async answer(telegramUserId: number, attemptId: string, answer: string, answerSource: PracticeAnswerSource | undefined): Promise<GradedAttempt> {
    const { attempt, question } = await this.loadUngraded(telegramUserId, attemptId);
    const grade = isNonAnswer(answer) ? skippedGrade(question.referenceAnswer) : await this.grade(telegramUserId, question, answer);
    return this.saveGrade(attempt, question, answer, answerSource, grade);
  }

  async skip(telegramUserId: number, attemptId: string): Promise<GradedAttempt> {
    const { attempt, question } = await this.loadUngraded(telegramUserId, attemptId);
    return this.saveGrade(attempt, question, '', undefined, skippedGrade(question.referenceAnswer));
  }

  async streamTutorReply(telegramUserId: number, attemptId: string, message: string, onDelta: (text: string) => void, signal?: AbortSignal): Promise<string> {
    const attempt = await this.getAttempt(telegramUserId, attemptId);
    const question = QUESTIONS_BY_ID.get(attempt.questionId);
    if (!question) throw new PracticeError('question_not_found', 410);
    if (attempt.status !== 'graded' || !attempt.grade) throw new PracticeError('attempt_not_graded', 409);
    if (attempt.messages.filter((m) => m.role === 'user').length >= PRACTICE_MAX_FOLLOWUPS) throw new PracticeError('too_many_followups', 422);

    const history: BaseMessage[] = attempt.messages.slice(-TUTOR_HISTORY_LIMIT).map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)));
    const messages = [new SystemMessage(buildTutorPrompt(question, LEARNER_LESSON_CONTEXT[question.biteId] ?? '', attempt.answer ?? '', attempt.grade)), ...history, new HumanMessage(message)];

    const userMessageAt = new Date();
    const handler = new UsageCallbackHandler();
    const startedAt = Date.now();
    let reply = '';
    try {
      const stream = await this.tutor.stream(messages, { callbacks: [handler], signal });
      for await (const chunk of stream) {
        const text = typeof chunk.content === 'string' ? chunk.content : '';
        if (!text) continue;
        reply += text;
        onDelta(text);
      }
    } finally {
      recordModelUsage({ source: 'learner-tutor', chatId: telegramUserId, handler, durationMs: Date.now() - startedAt });
    }

    if (reply.trim()) {
      await appendAttemptMessages(telegramUserId, attemptId, [
        { role: 'user', content: message, createdAt: userMessageAt },
        { role: 'assistant', content: reply, createdAt: new Date() },
      ]);
    }
    return reply;
  }

  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'webm';
    const text = await getTranscriptFromBuffer(audio, `answer.${extension}`, mimeType.split(';')[0]);
    return text.trim();
  }

  private async loadUngraded(telegramUserId: number, attemptId: string): Promise<{ attempt: PracticeAttempt; question: LearnerQuestion }> {
    const attempt = await this.getAttempt(telegramUserId, attemptId);
    if (attempt.status === 'graded') throw new PracticeError('already_graded', 409);
    const question = QUESTIONS_BY_ID.get(attempt.questionId);
    if (!question) throw new PracticeError('question_not_found', 410);
    return { attempt, question };
  }

  private async grade(telegramUserId: number, question: LearnerQuestion, answer: string): Promise<PracticeGrade> {
    const handler = new UsageCallbackHandler();
    const startedAt = Date.now();
    try {
      const raw = await this.grader
        .withStructuredOutput(gradeSchema, { name: 'grade_answer' })
        .invoke([new SystemMessage(GRADER_PROMPT), new HumanMessage(buildGraderInput(question, answer))], { callbacks: [handler] });
      return finalizeGrade(raw, question.referenceAnswer);
    } catch (err) {
      this.logger.error(`Grading failed for ${question.id}: ${getErrorMessage(err)}`);
      throw new PracticeError('grading_failed', 502);
    } finally {
      recordModelUsage({ source: 'learner-practice', chatId: telegramUserId, handler, durationMs: Date.now() - startedAt });
    }
  }

  private async saveGrade(attempt: PracticeAttempt, question: LearnerQuestion, answer: string, answerSource: PracticeAnswerSource | undefined, grade: PracticeGrade): Promise<GradedAttempt> {
    const { telegramUserId } = attempt;
    const saved = await saveAttemptGrade(telegramUserId, String(attempt._id), answer, answerSource, grade);
    if (!saved) throw new PracticeError('already_graded', 409);

    const now = new Date();
    const prevStats = await getPracticeQuestionStats(telegramUserId, question.id);
    const key = { _id: practiceStatsId(telegramUserId, question.id), telegramUserId, questionId: question.id, biteId: question.biteId };
    await savePracticeQuestionStats(nextQuestionStats(prevStats, key, grade.score, now)).catch((err) =>
      this.logger.error(`Failed to save practice stats ${key._id}: ${getErrorMessage(err)}`),
    );

    const progress = grade.score < PRACTICE_FUZZY_THRESHOLD ? await this.markLessonFuzzy(telegramUserId, question.biteId, now) : undefined;
    return { attempt: saved, progress };
  }

  // A weak answer sends the lesson back into spaced review — unless it's already weak there.
  private async markLessonFuzzy(telegramUserId: number, biteId: string, now: Date): Promise<LearnerProgress | undefined> {
    if (REFERENCE_BITES.has(biteId)) return undefined;
    try {
      const current = await getProgress(telegramUserId);
      const rating = current?.states?.[biteId]?.rating;
      if (rating === 'fuzzy' || rating === 'nope') return undefined;
      const doc = await applyRatingServerSide(telegramUserId, biteId, 'fuzzy', now);
      return toProgressDto(doc);
    } catch (err) {
      this.logger.error(`Failed to mark ${biteId} fuzzy for ${telegramUserId}: ${getErrorMessage(err)}`);
      return undefined;
    }
  }
}
