import { MY_USER_ID } from '@core/config';
import { startNewTopic } from './start-new-topic';

/**
 * Process daily topic for the user
 */
export async function processDailyTopic(): Promise<void> {
  try {
    const result = await startNewTopic();
    if (!result.success) {
      console.warn(`Could not start topic: ${result.message}`);
    }
  } catch (error) {
    console.error('Failed to process daily topic:', error);
  }
}
