import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'Rollinspark';

export const CONNECTION_NAME = 'ROLLINSPARK_MONGO_CONNECTION';

export const COLLECTIONS = {
  SUBSCRIPTION: 'Subscription',
  USER: 'User',
};
