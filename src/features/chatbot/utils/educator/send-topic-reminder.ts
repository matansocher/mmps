import { MY_USER_ID } from '@core/config';
import { getCourseParticipationForSummaryReminder, saveSummarySent } from '../../../educator/mongo';
import { generateSummaryMessage } from '../../../educator/utils';

/**
 * Send topic reminder
 */
export async function sendTopicReminder(): Promise<string | null> {
  try {
    const topicParticipation = await getCourseParticipationForSummaryReminder();
    if (!topicParticipation || !topicParticipation.summaryDetails || topicParticipation.chatId !== MY_USER_ID) {
      return null;
    }

    const summaryMessage = generateSummaryMessage(topicParticipation.summaryDetails);
    await saveSummarySent(topicParticipation._id.toString());

    return summaryMessage;
  } catch (error) {
    console.error('Failed to send topic reminder:', error);
    return null;
  }
}
