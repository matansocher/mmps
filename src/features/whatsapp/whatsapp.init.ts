import type { Express } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { WHATSAPP_WEBHOOK_PATH } from './constants';
import { registerWhatsappRoutes } from './whatsapp.controller';

const logger = new Logger('whatsapp:init');

export function initWhatsapp(app: Express): void {
  registerWhatsappRoutes(app);
  const missing = ['WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'VERIFY_TOKEN'].filter((key) => !env[key]);
  if (missing.length) logger.warn(`WhatsApp webhook is missing env vars: ${missing.join(', ')}`);
  if (!env.WHATSAPP_APP_SECRET) logger.warn('WHATSAPP_APP_SECRET not set — webhook signature validation is disabled');
  logger.log(`WhatsApp webhook registered at ${WHATSAPP_WEBHOOK_PATH}`);
}
