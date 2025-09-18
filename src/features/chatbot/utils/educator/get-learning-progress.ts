import { MY_USER_ID } from '@core/config';
import { getActiveTopicParticipation, getTopic, getTopicParticipations } from '../../../educator/mongo';
import { Topic, TopicParticipationStatus } from '../../../educator/types';
import { EducatorResponse } from './start-new-topic';

/**
 * Get learning progress for the user
 */
export async function getLearningProgress(): Promise<EducatorResponse> {
  try {
    const participations = await getTopicParticipations(MY_USER_ID);
    const completed = participations.filter((p) => p.status === TopicParticipationStatus.Completed).length;
    const active = participations.filter((p) => p.status === TopicParticipationStatus.Assigned).length;

    let activeTopicInfo = '';
    let activeTopic: Topic | null = null;
    if (active > 0) {
      const activeParticipation = await getActiveTopicParticipation(MY_USER_ID);
      if (activeParticipation) {
        activeTopic = await getTopic(activeParticipation.topicId);
        activeTopicInfo = activeTopic ? `\n📖 Currently learning: **${activeTopic.title}**` : '';
      }
    }

    const message = `📊 **Your Learning Progress:**\n\n` + `✅ Topics completed: ${completed}\n` + `📚 Total topics studied: ${participations.length}` + activeTopicInfo;

    return {
      success: true,
      message,
      topic: activeTopic,
    };
  } catch (error) {
    console.error(`Error getting progress:`, error);
    return {
      success: false,
      message: 'Failed to retrieve your progress. Please try again.',
      error: error.message,
    };
  }
}
