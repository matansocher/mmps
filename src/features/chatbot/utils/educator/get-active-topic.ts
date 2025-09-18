import { MY_USER_ID } from '@core/config';
import { getActiveTopicParticipation, getTopic } from '../../../educator/mongo';
import { EducatorResponse } from './start-new-topic';

/**
 * Get active topic information
 */
export async function getActiveTopic(): Promise<EducatorResponse> {
  try {
    const activeParticipation = await getActiveTopicParticipation(MY_USER_ID);
    if (!activeParticipation) {
      return {
        success: true,
        message: 'No active topic. Would you like me to start teaching you something new?',
      };
    }

    const topic = await getTopic(activeParticipation.topicId);
    return {
      success: true,
      message: `📖 You're currently learning about: **${topic?.title}**\n\nFeel free to ask me questions about it or tell me when you're done!`,
      topic,
      participation: activeParticipation,
    };
  } catch (error) {
    console.error(`Error getting active topic:`, error);
    return {
      success: false,
      message: 'Failed to retrieve active topic information.',
      error: error.message,
    };
  }
}
