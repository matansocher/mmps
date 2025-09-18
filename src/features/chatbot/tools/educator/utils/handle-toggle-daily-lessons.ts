import { createUserPreference, getUserPreference, updateUserPreference } from '../../../../educator/mongo';

export async function handleToggleDailyLessons(chatId: number, enabled: boolean): Promise<string> {
  try {
    const userPref = await getUserPreference(chatId);
    if (!userPref) {
      await createUserPreference(chatId);
    }

    await updateUserPreference(chatId, { isStopped: !enabled });

    if (enabled) {
      return "✅ Daily lessons enabled! You'll receive new topics at 12 PM and reminders at 10 PM.";
    } else {
      return '⏸️ Daily lessons paused. You can still ask me to teach you topics manually.';
    }
  } catch (error) {
    console.error('Error toggling daily lessons:', error);
    return 'Failed to update your preferences. Please try again.';
  }
}
