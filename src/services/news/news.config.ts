import { CHANNELS } from '@services/telegram-client';

export const TELEGRAM_CHANNEL_IDS_TO_LISTEN = [
  CHANNELS.CALCALIST.id,
  CHANNELS.NEWS_FROM_THE_FIELD.id,
  CHANNELS.ABU_ZALAH.id,
  CHANNELS.SHLOMO_WEATHER.id,
  CHANNELS.ALMOG_BOKER_UPDATES.id,
];

export const NEWS_ASSISTANT_ID = 'asst_XxqH5Y4VpkixqqugmBfDWLqq';

export const DAILY_PHOTO_PROMPT = 'You are getting a summary of daily news. Try to create the best image you can get describing the events on that day. The news of the day are:';
