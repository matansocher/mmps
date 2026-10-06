import type { Express } from 'express';
import { env } from 'node:process';
import { parseAllowedPhones, registerWhatsAppWebhook } from '@services/whatsapp';
import { STICKERS_WEBHOOK_PATH } from './constants';
import { handleIncomingMessage } from './sticker-vault.service';

export function registerStickersRoutes(app: Express): void {
  registerWhatsAppWebhook(app, {
    path: STICKERS_WEBHOOK_PATH,
    allowedPhones: parseAllowedPhones(env.WHATSAPP_ALLOWED_PHONES),
    onMessage: handleIncomingMessage,
  });
}
