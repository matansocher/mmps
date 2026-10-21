import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import { createRateLimiter } from '@core/express';
import { getErrorMessage, Logger } from '@core/utils';
import { getRequestUser, type LearnerAuthUser, learnerAuthMiddleware } from '../api/auth.middleware';
import { PRACTICE_ANSWER_MAX_CHARS, PRACTICE_AUDIO_MAX_BYTES, PRACTICE_FOLLOWUP_MAX_CHARS } from '../constants';
import type { PracticeAnswerSource, PracticeVerdict } from '../types';
import { parseScope, toAttemptDto, toAttemptSummaryDto } from './practice.dto';
import { PracticeError, type PracticeService } from './practice.service';
import { openSseStream, writeSseEvent } from './sse';

const logger = new Logger('learner:practice:api');
const BASE = '/api/learner/practice';
const HOUR_MS = 60 * 60 * 1000;
const VERDICTS: readonly PracticeVerdict[] = ['correct', 'partial', 'incorrect'];
const MAX_LIST_LIMIT = 50;

function userLimiter(prefix: string, max: number): RequestHandler {
  return createRateLimiter({ windowMs: HOUR_MS, max, prefix: `learner-practice-${prefix}`, keyGenerator: (req) => String(getRequestUser(req)?.telegramUserId ?? req.ip) });
}

type Handler = (req: Request, res: Response, user: LearnerAuthUser) => Promise<void>;

function withUser(name: string, handler: Handler): RequestHandler {
  return async (req: Request, res: Response) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    try {
      await handler(req, res, user);
    } catch (err) {
      if (err instanceof PracticeError) {
        res.status(err.status).json({ error: err.code });
        return;
      }
      logger.error(`${name} failed for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      if (!res.headersSent) res.status(500).json({ error: `${name}_failed` });
    }
  };
}

function readText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length <= max ? text : null;
}

export function registerPracticeApiRoutes(app: Express, service: PracticeService): void {
  app.use(BASE, learnerAuthMiddleware);

  app.get(
    `${BASE}/scope`,
    withUser('practice_scope', async (_req, res, user) => {
      res.json(await service.getScope(user.telegramUserId));
    }),
  );

  app.post(
    `${BASE}/attempts`,
    userLimiter('start', 60),
    withUser('practice_start', async (req, res, user) => {
      const scope = parseScope(req.body?.scope);
      if (!scope) {
        res.status(400).json({ error: 'invalid_scope' });
        return;
      }
      const attempt = await service.startAttempt(user.telegramUserId, scope);
      res.status(201).json({ attempt: toAttemptDto(attempt) });
    }),
  );

  app.get(
    `${BASE}/attempts`,
    withUser('practice_list', async (req, res, user) => {
      const before = typeof req.query.before === 'string' ? new Date(req.query.before) : undefined;
      const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(req.query.limit) || 20));
      const verdict = VERDICTS.find((v) => v === req.query.verdict);
      const attempts = await service.listAttempts(user.telegramUserId, { before: before && !isNaN(before.getTime()) ? before : undefined, limit, verdict });
      res.json({ attempts: attempts.map(toAttemptSummaryDto), hasMore: attempts.length === limit });
    }),
  );

  app.get(
    `${BASE}/attempts/:id`,
    withUser('practice_get', async (req, res, user) => {
      const attempt = await service.getAttempt(user.telegramUserId, String(req.params.id));
      res.json({ attempt: toAttemptDto(attempt) });
    }),
  );

  app.post(
    `${BASE}/attempts/:id/answer`,
    userLimiter('answer', 30),
    withUser('practice_answer', async (req, res, user) => {
      const answer = readText(req.body?.answer, PRACTICE_ANSWER_MAX_CHARS);
      if (!answer) {
        res.status(400).json({ error: 'invalid_answer' });
        return;
      }
      const source: PracticeAnswerSource = req.body?.source === 'voice' ? 'voice' : 'text';
      const { attempt, progress } = await service.answer(user.telegramUserId, String(req.params.id), answer, source);
      res.json({ attempt: toAttemptDto(attempt), progress });
    }),
  );

  app.post(
    `${BASE}/attempts/:id/skip`,
    withUser('practice_skip', async (req, res, user) => {
      const { attempt, progress } = await service.skip(user.telegramUserId, String(req.params.id));
      res.json({ attempt: toAttemptDto(attempt), progress });
    }),
  );

  app.post(
    `${BASE}/attempts/:id/messages`,
    userLimiter('tutor', 60),
    withUser('practice_tutor', async (req, res, user) => {
      const content = readText(req.body?.content, PRACTICE_FOLLOWUP_MAX_CHARS);
      if (!content) {
        res.status(400).json({ error: 'invalid_message' });
        return;
      }
      // Validates ownership / state before switching to SSE so errors stay plain JSON.
      await service.getAttempt(user.telegramUserId, String(req.params.id));

      const abort = new AbortController();
      res.on('close', () => abort.abort());
      // Open the stream immediately so the router's first-byte timeout never trips while the model thinks.
      openSseStream(res);
      try {
        const reply = await service.streamTutorReply(user.telegramUserId, String(req.params.id), content, (text) => writeSseEvent(res, 'delta', { text }), abort.signal);
        writeSseEvent(res, 'done', { content: reply, createdAt: new Date().toISOString() });
      } catch (err) {
        if (!(err instanceof PracticeError)) logger.error(`Tutor stream failed for ${user.telegramUserId}: ${getErrorMessage(err)}`);
        writeSseEvent(res, 'error', { error: err instanceof PracticeError ? err.code : 'tutor_failed' });
      }
      res.end();
    }),
  );

  app.post(
    `${BASE}/transcribe`,
    userLimiter('transcribe', 30),
    express.raw({ type: 'audio/*', limit: PRACTICE_AUDIO_MAX_BYTES }),
    withUser('practice_transcribe', async (req, res) => {
      const mimeType = String(req.headers['content-type'] ?? '');
      if (!Buffer.isBuffer(req.body) || req.body.length === 0 || !mimeType.startsWith('audio/')) {
        res.status(400).json({ error: 'invalid_audio' });
        return;
      }
      const text = await service.transcribe(req.body, mimeType);
      res.json({ text });
    }),
  );

  app.use(BASE, (err: Error & { type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: 'payload_too_large' });
      return;
    }
    next(err);
  });
}
