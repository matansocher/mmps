import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { MY_USER_ID, TOODIE_USER_ID } from '@core/config';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { applyAllowlist, provideTelegramBot } from '@services/telegram';
import { ensureExpenseIndexes, ensureIngestExpenseIndexes, DB_NAME as EXPENSES_DB_NAME } from '@shared/expenses';
import { registerExpensesApiRoutes } from './api';
import { BOT_CONFIG } from './expenses.config';
import { ExpensesController } from './expenses.controller';
import { ExpensesLauncherService } from './launcher.service';

const logger = new Logger('initExpenses');

const ALLOWED_USER_IDS: ReadonlyArray<number> = [MY_USER_ID, TOODIE_USER_ID];

export async function initExpenses(app: Express): Promise<void> {
  await createMongoConnection(EXPENSES_DB_NAME);
  await ensureExpenseIndexes();
  await ensureIngestExpenseIndexes();

  const bot = provideTelegramBot(BOT_CONFIG);
  applyAllowlist(bot, ALLOWED_USER_IDS, { denyMessage: 'Sorry, this bot is private.' });

  const launcher = new ExpensesLauncherService(bot);
  const controller = new ExpensesController(bot, launcher);
  controller.init();

  registerExpensesApiRoutes(app);

  const spaDist = path.resolve('apps/expenses-web/dist');
  app.use('/expenses', express.static(spaDist));
  app.get('/expenses/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Expenses SPA served from ${spaDist} at /expenses/*`);
}
