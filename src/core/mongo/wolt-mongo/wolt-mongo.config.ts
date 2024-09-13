import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'Wolt';

export const CONNECTION_NAME = 'WOLT_MONGO_CONNECTION';

export const COLLECTIONS = {
  SUBSCRIPTION: 'Subscription',
  USER: 'User',
  ANALYTIC_LOGS: 'AnalyticLogs',
};
