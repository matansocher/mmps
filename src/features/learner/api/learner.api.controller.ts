import type { Express, Request, Response } from 'express';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { TelegramBotConfig } from '@services/telegram';
import { getProgress, type ReadMap, saveCourseProgress } from '../mongo';
import { learnerAuthMiddleware } from './auth.middleware';

const logger = new Logger('LearnerApiController');

export type LearnerApiDeps = {
  readonly botConfig: TelegramBotConfig;
};

type LearnerEventBody = {
  readonly type?: string;
  readonly courseId?: string;
  readonly courseTitle?: string;
  readonly lessonId?: string;
  readonly lessonTitle?: string;
};

const EVENT_ACTIONS: Record<string, string> = {
  open: 'OPEN_APP',
  lesson_complete: 'COMPLETE_LESSON',
  course_complete: 'COMPLETE_COURSE',
};

function userDetailsFromReq(req: Request) {
  const { telegramUserId, chatId, username, firstName, lastName } = req.learnerUser!;
  return { telegramUserId, chatId, username: username ?? '', firstName: firstName ?? '', lastName: lastName ?? '' };
}

export function registerLearnerApiRoutes(app: Express, deps: LearnerApiDeps): void {
  const { botConfig } = deps;

  app.use('/api/learner', learnerAuthMiddleware);

  app.post('/api/learner/events', (req: Request, res: Response) => {
    const { type, courseId, courseTitle, lessonId, lessonTitle } = (req.body ?? {}) as LearnerEventBody;
    const action = type ? EVENT_ACTIONS[type] : undefined;
    if (!action) {
      res.status(400).json({ error: 'invalid_event_type' });
      return;
    }

    const data: Record<string, string> = { source: 'mini_app' };
    if (courseTitle) data.course = courseTitle;
    else if (courseId) data.course = courseId;
    if (type === 'lesson_complete' && (lessonTitle || lessonId)) data.lesson = lessonTitle ?? lessonId!;

    notify(botConfig, { action, ...data }, userDetailsFromReq(req));
    res.status(204).end();
  });

  app.get('/api/learner/progress', async (req: Request, res: Response<{ courses: ReadMap } | { error: string }>) => {
    try {
      const courses = await getProgress(req.learnerUser!.chatId);
      res.json({ courses });
    } catch (err) {
      logger.error(`Failed to load progress: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'load_failed' });
    }
  });

  app.put('/api/learner/progress/:courseId', async (req: Request, res: Response) => {
    const courseId = req.params.courseId;
    const { lessonIds } = (req.body ?? {}) as { lessonIds?: unknown };
    if (typeof courseId !== 'string' || !courseId || !Array.isArray(lessonIds) || !lessonIds.every((id) => typeof id === 'string')) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    try {
      await saveCourseProgress(req.learnerUser!.chatId, courseId, lessonIds as string[]);
      res.status(204).end();
    } catch (err) {
      logger.error(`Failed to save progress: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'save_failed' });
    }
  });

  logger.log('Learner API routes registered at /api/learner/*');
}
