import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Logger } from '@core/utils';
import {
  advanceToNextQuestion,
  beginSession,
  countByTopicAndLevel,
  DAILY_HEARTS,
  finalizeSession,
  getActiveSession,
  getStackerUser,
  gradeAnswer,
  Level,
  LEVELS,
  abandonActiveSessions,
  NextQuestionResult,
  QUESTION_TYPES,
  Topic,
  TOPICS,
} from '@shared/stacker';
import { stackerAuthMiddleware } from './auth.middleware';
import {
  AbandonResponse,
  AnswerBodySchema,
  AnswerResponse,
  MeResponse,
  NextQuestionResponse,
  QuestionDto,
  StartSessionBodySchema,
  StartSessionResponse,
  TopicsResponse,
} from './dto';

const logger = new Logger('StackerApiController');

const TOPIC_LABELS: Record<Topic, string> = {
  [TOPICS.JAVASCRIPT]: 'JavaScript',
  [TOPICS.TYPESCRIPT]: 'TypeScript',
  [TOPICS.NODE]: 'Node.js',
  [TOPICS.PYTHON]: 'Python',
  [TOPICS.ALGORITHMS]: 'Algorithms',
  [TOPICS.SQL]: 'SQL',
};

const LEVEL_LABELS: Record<Level, string> = {
  [LEVELS.BEGINNER]: 'Beginner',
  [LEVELS.INTERMEDIATE]: 'Intermediate',
  [LEVELS.ADVANCED]: 'Advanced',
};

function isValidTopic(v: string): v is Topic {
  return Object.values(TOPICS).includes(v as Topic);
}
function isValidLevel(v: string): v is Level {
  return Object.values(LEVELS).includes(v as Level);
}

function toQuestionDto(q: NextQuestionResult & { complete: false }): QuestionDto {
  const question = q.question;
  const id = question._id!.toHexString();
  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    return { id, type: 'multiple_choice', question: question.question, options: question.options };
  }
  if (question.type === QUESTION_TYPES.CODE_OUTPUT) {
    return { id, type: 'code_output', question: question.question, codeSnippet: question.codeSnippet, options: question.options };
  }
  return { id, type: 'fill_in', question: question.question, codeSnippet: question.codeSnippet };
}

export function registerStackerApiRoutes(app: Express): void {
  app.use('/api/stacker', stackerAuthMiddleware);

  // GET /api/stacker/me
  app.get('/api/stacker/me', async (req: Request, res: Response<MeResponse>) => {
    const { chatId } = req.stackerUser!;
    const user = await getStackerUser(chatId);
    const active = await getActiveSession(chatId);
    res.json({
      user: {
        telegramUserId: user!.telegramUserId,
        username: user!.username,
        xp: user!.xp,
        streakCount: user!.streakCount,
        heartsRemaining: user!.heartsRemaining,
        heartsMax: DAILY_HEARTS,
      },
      activeSession: active ? { id: active._id!.toHexString(), topic: active.topic, level: active.level } : null,
    });
  });

  // GET /api/stacker/topics
  app.get('/api/stacker/topics', async (_req: Request, res: Response<TopicsResponse>) => {
    const counts = await countByTopicAndLevel();
    res.json({
      topics: Object.values(TOPICS).map((topic) => ({
        topic,
        label: TOPIC_LABELS[topic],
        levels: Object.values(LEVELS).map((level) => ({
          level,
          label: LEVEL_LABELS[level],
          questionCount: counts[`${topic}:${level}`] ?? 0,
        })),
      })),
    });
  });

  // POST /api/stacker/sessions
  app.post('/api/stacker/sessions', async (req: Request, res: Response<StartSessionResponse>) => {
    const { chatId, telegramUserId, username } = req.stackerUser!;
    const parsed = StartSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, reason: 'no_questions' });
      return;
    }
    if (!isValidTopic(parsed.data.topic) || !isValidLevel(parsed.data.level)) {
      res.status(400).json({ ok: false, reason: 'no_questions' });
      return;
    }
    const result = await beginSession(chatId, telegramUserId, username, parsed.data.topic, parsed.data.level);
    if (!result.ok) {
      res.json({ ok: false, reason: (result as { ok: false; reason: 'out_of_hearts' | 'no_questions' }).reason });
      return;
    }
    res.json({ ok: true, sessionId: result.session._id!.toHexString(), totalQuestions: result.session.initialSize });
  });

  // GET /api/stacker/sessions/:id/next
  app.get('/api/stacker/sessions/:id/next', async (req: Request, res: Response<NextQuestionResponse>) => {
    const { chatId } = req.stackerUser!;
    const sessionId = req.params.id;
    const session = await getActiveSession(chatId);
    if (!session || session._id!.toHexString() !== sessionId) {
      res.json({ complete: true });
      return;
    }
    const result = await advanceToNextQuestion(session);
    if (result.complete) {
      await finalizeSession(chatId, result.session);
      res.json({ complete: true });
      return;
    }
    const nextResult = result as NextQuestionResult & { complete: false };
    res.json({ complete: false, question: toQuestionDto(nextResult), progress: nextResult.progress });
  });

  // POST /api/stacker/sessions/:id/answer
  app.post('/api/stacker/sessions/:id/answer', async (req: Request, res: Response<AnswerResponse | { error: string }>) => {
    const { chatId } = req.stackerUser!;
    const parsed = AnswerBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const sessionId = new ObjectId(req.params.id);
    let questionId: ObjectId;
    try {
      questionId = new ObjectId(parsed.data.questionId);
    } catch {
      res.status(400).json({ error: 'invalid_question_id' });
      return;
    }
    const result = await gradeAnswer({
      chatId,
      sessionId,
      questionId,
      selectedOption: parsed.data.selectedOption,
      text: parsed.data.text,
    });
    if (!result) {
      res.status(409).json({ error: 'no_active_question' });
      return;
    }
    res.json({
      correct: result.correct,
      correctOptionIndex: result.correctOptionIndex,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      heartsRemaining: result.user.heartsRemaining,
      outOfHearts: result.outOfHearts,
    });
  });

  // POST /api/stacker/sessions/:id/abandon
  app.post('/api/stacker/sessions/:id/abandon', async (req: Request, res: Response<AbandonResponse>) => {
    const { chatId } = req.stackerUser!;
    await abandonActiveSessions(chatId);
    res.json({ ok: true });
  });

  logger.log('Stacker API routes registered at /api/stacker/*');
}
