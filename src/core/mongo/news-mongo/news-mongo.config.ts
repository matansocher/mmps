import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'News';

export const CONNECTION_NAME = 'NEWS_MONGO_CONNECTION';

export const COLLECTIONS = {
  SUBSCRIPTION: 'Subscription',
  USER: 'User',
  THREAD: 'Thread',
  ANALYTIC_LOGS: 'AnalyticLogs',
};
