import type { Express, Request, Response } from 'express';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { TelegramBotConfig } from '@services/telegram';
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

  logger.log('Learner API routes registered at /api/learner/*');
}
