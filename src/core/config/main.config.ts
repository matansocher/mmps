import { env } from 'node:process';

export const isProd = env.IS_PROD === 'true';

export const MMPS_BASE_URL = 'https://mmps-a9baabab2459.herokuapp.com';

export const MY_USER_ID = 862305226;
export const MY_USER_NAME = '@daninave1';

export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const LOCAL_FILES_PATH = './assets/downloads';

export const PORT = Number(env.PORT) || 3000;
