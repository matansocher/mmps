import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { getSavedSummaryLocation } from './mongo';

const logger = new Logger('summary-location');

export const DEFAULT_SUMMARY_LOCATION = env.CHATBOT_SUMMARY_LOCATION || 'Kfar Saba';

// Order: location saved via chat, then CHATBOT_SUMMARY_LOCATION, then Kfar Saba.
export async function getSummaryLocation(): Promise<string> {
  try {
    return (await getSavedSummaryLocation()) || DEFAULT_SUMMARY_LOCATION;
  } catch (err) {
    logger.error(`Failed to read saved summary location: ${getErrorMessage(err)}`);
    return DEFAULT_SUMMARY_LOCATION;
  }
}
