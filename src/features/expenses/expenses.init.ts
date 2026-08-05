import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { MY_USER_ID, WIFE_USER_ID } from '@core/config';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { applyAllowlist, provideTelegramBot } from '@services/telegram';
import { ensureExpenseIndexes, ensureIngestExpenseIndexes, DB_NAME as EXPENSES_DB_NAME } from '@shared/expenses';
import { registerExpensesApiRoutes } from './api';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './expenses.config';
import { ExpensesController } from './expenses.controller';

const logger = new Logger('initExpenses');

const ALLOWED_USER_IDS: ReadonlyArray<number> = [MY_USER_ID, WIFE_USER_ID];

export async function initExpenses(app: Express): Promise<void> {
  await createMongoConnection(EXPENSES_DB_NAME);
  await ensureExpenseIndexes();
  await ensureIngestExpenseIndexes();

  const bot = provideTelegramBot(BOT_CONFIG);
  applyAllowlist(bot, ALLOWED_USER_IDS, {
    denyMessage: 'Sorry, this bot is private.',
    onDeny: (userDetails) => notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ACCESS_DENIED }, userDetails),
  });

  const controller = new ExpensesController(bot);
  controller.init();

  registerExpensesApiRoutes(app);

  const spaDist = path.resolve('apps/expenses-web/dist');
  app.use('/expenses', express.static(spaDist));
  app.get('/expenses/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Expenses SPA served from ${spaDist} at /expenses/*`);
}
