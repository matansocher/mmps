import type { Bot } from 'grammy';
import type { Express, Response } from 'express';
import { Logger } from '@core/utils';
import { handleWorkflowRunCompleted } from './github-webhook.service';
import type { RequestWithRawBody, WorkflowRunEvent } from './types';
import { verifyGithubWebhookSignature } from './verify-signature';

const logger = new Logger('GitHubWebhookController');

export function registerGithubWebhookRoutes(app: Express, bot: Bot): void {
  app.post('/api/github/webhooks', async (req: RequestWithRawBody, res: Response) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      if (!signature || !req.rawBody) {
        res.status(401).json({ error: 'Missing signature or body' });
        return;
      }

      if (!verifyGithubWebhookSignature(req.rawBody, signature)) {
        logger.warn('Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const event = req.headers['x-github-event'] as string;

      if (event === 'workflow_run') {
        const payload = req.body as WorkflowRunEvent;
        if (payload.action === 'completed') {
          handleWorkflowRunCompleted(payload, bot).catch((err) => logger.error(`Webhook handler error: ${err}`));
        }
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      logger.error(`Webhook processing error: ${err}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
