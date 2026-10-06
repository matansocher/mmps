import type { Express } from 'express';
import { env } from 'node:process';
import { createMongoConnection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { STICKERS_DB_NAME, STICKERS_WEBHOOK_PATH } from './constants';
import { ensureSearchIndexes, ensureStickerIndexes } from './mongo';
import { registerStickersRoutes } from './stickers.controller';

const logger = new Logger('stickers:init');

export async function initStickers(app: Express): Promise<void> {
  // Routes go first and synchronously: they must be registered before the global express.json() parser.
  registerStickersRoutes(app);
  const missing = ['WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'VERIFY_TOKEN'].filter((key) => !env[key]);
  if (missing.length) logger.warn(`WhatsApp webhook is missing env vars: ${missing.join(', ')}`);
  if (!env.WHATSAPP_APP_SECRET) logger.warn('WHATSAPP_APP_SECRET not set — webhook signature validation is disabled');
  if (!env.WHATSAPP_ALLOWED_PHONES?.trim()) logger.warn('WHATSAPP_ALLOWED_PHONES not set — the bot replies to everyone');
  logger.log(`Stickers webhook registered at ${STICKERS_WEBHOOK_PATH}`);

  await createMongoConnection(STICKERS_DB_NAME);
  await Promise.all([
    ensureStickerIndexes().catch((err) => logger.error(`Failed to ensure sticker indexes: ${getErrorMessage(err)}`)),
    ensureSearchIndexes().catch((err) => logger.error(`Failed to ensure search indexes: ${getErrorMessage(err)}`)),
  ]);
}
