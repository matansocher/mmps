import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'VoicePal';

export const CONNECTION_NAME = 'VOICE_PAL_MONGO_CONNECTION';

export const COLLECTIONS = {
  USER: 'User',
};
