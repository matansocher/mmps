import type { Express, Request, Response } from 'express';
import express from 'express';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { WHATSAPP_SIGNATURE_HEADER, WHATSAPP_WEBHOOK_PATH } from './constants';
import { handleIncomingMessage } from './sticker-vault.service';
import type { WhatsAppWebhookPayload } from './types';
import { describeFailedStatuses, describePayload, extractIncomingMessage, isValidSignature } from './whatsapp.utils';

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
    logger.warn(`Webhook verification failed: mode=${mode}, verifyTokenConfigured=${Boolean(env.VERIFY_TOKEN)}, tokenMatches=${token === env.VERIFY_TOKEN}`);
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
      const payload = req.body as WhatsAppWebhookPayload;
      const signature = req.header(WHATSAPP_SIGNATURE_HEADER);
      logger.log(`Webhook event received (${req.rawBody?.length ?? 0} bytes, signature=${signature ? 'present' : 'missing'}): ${describePayload(payload)}`);

      const appSecret = env.WHATSAPP_APP_SECRET;
      if (appSecret && !isValidSignature(req.rawBody ?? Buffer.alloc(0), signature, appSecret)) {
        logger.warn(`Rejected webhook with invalid signature (signature=${signature ? 'present' : 'missing'}); check WHATSAPP_APP_SECRET matches the Meta app secret`);
        res.sendStatus(401);
        return;
      }

      res.sendStatus(200);

      describeFailedStatuses(payload).forEach((failure) => logger.error(`Message delivery failed: ${failure}`));

      const message = extractIncomingMessage(payload);
      if (!message) {
        logger.log('Webhook event has no text or sticker message, nothing to handle');
        return;
      }

      logger.log(`Incoming ${message.kind} from ${message.from}: ${message.kind === 'text' ? message.text : message.mediaId}`);
      handleIncomingMessage(message).catch((err) => logger.error(`Failed to handle ${message.kind} message: ${getErrorMessage(err)}`));
    },
  );
}
