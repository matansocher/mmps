import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'Selfie';

export const CONNECTION_NAME = 'SELFIE_MONGO_CONNECTION';

export const COLLECTIONS = {
  DAY_DETAILS: 'DayDetails',
};
