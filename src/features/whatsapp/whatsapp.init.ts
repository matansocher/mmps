import type { Express } from 'express';
import { env } from 'node:process';
import { createMongoConnection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { WHATSAPP_DB_NAME, WHATSAPP_WEBHOOK_PATH } from './constants';
import { ensureSearchIndexes, ensureStickerIndexes } from './mongo';
import { registerWhatsappRoutes } from './whatsapp.controller';

const logger = new Logger('whatsapp:init');

export async function initWhatsapp(app: Express): Promise<void> {
  // Routes go first and synchronously: they must be registered before the global express.json() parser.
  registerWhatsappRoutes(app);
  const missing = ['WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'VERIFY_TOKEN'].filter((key) => !env[key]);
  if (missing.length) logger.warn(`WhatsApp webhook is missing env vars: ${missing.join(', ')}`);
  if (!env.WHATSAPP_APP_SECRET) logger.warn('WHATSAPP_APP_SECRET not set — webhook signature validation is disabled');
  logger.log(`WhatsApp webhook registered at ${WHATSAPP_WEBHOOK_PATH}`);

  await createMongoConnection(WHATSAPP_DB_NAME);
  await Promise.all([
    ensureStickerIndexes().catch((err) => logger.error(`Failed to ensure sticker indexes: ${getErrorMessage(err)}`)),
    ensureSearchIndexes().catch((err) => logger.error(`Failed to ensure search indexes: ${getErrorMessage(err)}`)),
  ]);
}
