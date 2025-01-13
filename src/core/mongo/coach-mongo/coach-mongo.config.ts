import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'Coach';

export const CONNECTION_NAME = 'COACH_MONGO_CONNECTION';

export const COLLECTIONS = {
  SUBSCRIPTION: 'Subscription',
  USER: 'User',
};
