import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getOrCreateTracker, incrementStreak } from '@shared/coke-quit';

const logger = new Logger('CokeQuitStreakIncrementScheduler');

export async function cokeQuitStreakIncrement(): Promise<void> {
  try {
    await getOrCreateTracker(MY_USER_ID);
    await incrementStreak(MY_USER_ID);
    logger.log('Incremented coke-quit streak for new day');
  } catch (err) {
    logger.error(`Failed to increment coke-quit streak: ${err}`);
  }
}
