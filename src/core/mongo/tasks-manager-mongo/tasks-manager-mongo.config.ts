import { env } from 'node:process';

export const MONGO_DB_URL = env.MONGO_DB_URL;

export const DB_NAME = 'TasksManager';

export const CONNECTION_NAME = 'TASKS_MANAGER_MONGO_CONNECTION';

export const COLLECTIONS = {
  TASK: 'Task',
};
