import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'Teacher';

export const CONNECTION_NAME = 'TEACHER_MONGO_CONNECTION';

export const COLLECTIONS = {
  LESSON: 'Lesson',
};
