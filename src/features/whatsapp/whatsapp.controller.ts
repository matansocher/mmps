import type { Express, Request, Response } from 'express';
import express from 'express';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { sendWhatsAppMessage } from '@services/whatsapp';
import { WHATSAPP_SIGNATURE_HEADER, WHATSAPP_WEBHOOK_PATH } from './constants';
import type { WhatsAppWebhookPayload } from './types';
import { buildReply, extractTextMessage, isValidSignature } from './whatsapp.utils';

const logger = new Logger('whatsapp:webhook');

type RawBodyRequest = Request & { rawBody?: Buffer };

export function registerWhatsappRoutes(app: Express): void {
  app.get(WHATSAPP_WEBHOOK_PATH, (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && env.VERIFY_TOKEN && token === env.VERIFY_TOKEN) {
      logger.log('Webhook verified');
      res
        .status(200)
        .type('text/plain')
        .send(String(challenge ?? ''));
      return;
    }
    res.sendStatus(403);
  });

  // Keep the raw bytes so the X-Hub-Signature-256 HMAC can be checked against exactly what Meta signed.
  app.post(
    WHATSAPP_WEBHOOK_PATH,
    express.json({
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = buf;
      },
    }),
    (req: RawBodyRequest, res: Response) => {
      const appSecret = env.WHATSAPP_APP_SECRET;
      if (appSecret && !isValidSignature(req.rawBody ?? Buffer.alloc(0), req.header(WHATSAPP_SIGNATURE_HEADER), appSecret)) {
        logger.warn('Rejected webhook with invalid signature');
        res.sendStatus(401);
        return;
      }

      res.sendStatus(200);

      const message = extractTextMessage(req.body as WhatsAppWebhookPayload);
      if (!message) return;

      logger.log(`Incoming message from ${message.from}: ${message.text}`);
      sendWhatsAppMessage(message.from, buildReply(message.text)).catch((err) => logger.error(`Failed to reply: ${getErrorMessage(err)}`));
    },
  );
}
