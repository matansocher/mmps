import { MY_USER_ID } from '@core/config';
import { createUserPreference, getUserPreference, updateUserPreference } from '../../../educator/mongo';
import { EducatorResponse } from './start-new-topic';

/**
 * Toggle daily lessons on/off
 */
export async function toggleDailyLessons(enabled: boolean): Promise<EducatorResponse> {
  try {
    const userPref = await getUserPreference(MY_USER_ID);
    if (!userPref) {
      await createUserPreference(MY_USER_ID);
    }

    await updateUserPreference(MY_USER_ID, { isStopped: !enabled });

    const message = enabled ? "✅ Daily lessons enabled! You'll receive new topics at 12 PM and reminders at 10 PM." : '⏸️ Daily lessons paused. You can still ask me to teach you topics manually.';

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error(`Error toggling daily lessons:`, error);
    return {
      success: false,
      message: 'Failed to update your preferences. Please try again.',
      error: error.message,
    };
  }
}
