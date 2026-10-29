import type { Express, Request, Response } from 'express';
import express from 'express';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { WHATSAPP_REENGAGEMENT_ERROR_CODE, WHATSAPP_SIGNATURE_HEADER } from './constants';
import type { FailedMessageStatus, IncomingMessage, WhatsAppWebhookPayload } from './types';
import { describeFailedStatuses, describePayload, extractFailedStatuses, extractIncomingMessage, isAllowedSender, isValidSignature } from './webhook.utils';

const logger = new Logger('whatsapp:webhook');

type RawBodyRequest = Request & { rawBody?: Buffer };

export type WhatsAppWebhookOptions = {
  readonly path: string;
  readonly onMessage: (message: IncomingMessage) => Promise<void>;
  readonly onFailedStatus?: (failure: FailedMessageStatus) => Promise<void>;
  readonly allowedPhones?: ReadonlySet<string>; // digits only; empty or missing = everyone
};

// Must be called before the global express.json() parser, so the raw body is kept for the signature check.
export function registerWhatsAppWebhook(app: Express, { path, onMessage, onFailedStatus, allowedPhones = new Set() }: WhatsAppWebhookOptions): void {
  app.get(path, (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && env.VERIFY_TOKEN && token === env.VERIFY_TOKEN) {
      logger.log(`Webhook verified at ${path}`);
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
    path,
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

      // 131047 (outside the 24h window) is expected for inactive users and handled by onFailedStatus, so it only warns.
      describeFailedStatuses(payload).forEach(({ text, errorCodes }) =>
        errorCodes.includes(WHATSAPP_REENGAGEMENT_ERROR_CODE) ? logger.warn(`Message delivery failed: ${text}`) : logger.error(`Message delivery failed: ${text}`),
      );
      if (onFailedStatus) {
        extractFailedStatuses(payload).forEach((failure) => onFailedStatus(failure).catch((err) => logger.error(`Failed to handle failed status of ${failure.messageId}: ${getErrorMessage(err)}`)));
      }

      const message = extractIncomingMessage(payload);
      if (!message) {
        logger.log('Webhook event has no text, sticker or button reply message, nothing to handle');
        return;
      }

      if (!isAllowedSender(message.from, allowedPhones)) {
        logger.log(`Ignoring ${message.kind} from ${message.from}: not in the allowlist`);
        return;
      }

      const detail = message.kind === 'text' ? message.text : message.kind === 'sticker' ? message.mediaId : message.buttonId;
      logger.log(`Incoming ${message.kind} from ${message.from}: ${detail}`);
      onMessage(message).catch((err) => logger.error(`Failed to handle ${message.kind} message: ${getErrorMessage(err)}`));
    },
  );
}
