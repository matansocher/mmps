import { MY_USER_ID } from '@core/config';
import { getTopic, getTopicParticipations } from '../../../educator/mongo';
import { TopicParticipationStatus } from '../../../educator/types';
import { EducatorResponse } from './start-new-topic';

/**
 * Get summaries of completed topics
 */
export async function getTopicSummaries(limit: number = 5): Promise<EducatorResponse> {
  try {
    const participations = await getTopicParticipations(MY_USER_ID);
    const completedParticipations = participations.filter((p) => p.status === TopicParticipationStatus.Completed);

    if (completedParticipations.length === 0) {
      return {
        success: true,
        message: "You haven't completed any topics yet.",
      };
    }

    const summaries = await Promise.all(
      completedParticipations.slice(-limit).map(async (p) => {
        const topic = await getTopic(p.topicId);
        if (p.summaryDetails) {
          return `**${topic?.title}**\n${p.summaryDetails.summary}`;
        }
        return `**${topic?.title}** - No summary available`;
      }),
    );

    const message = `📚 **Your Recent Learning Summaries:**\n\n${summaries.join('\n\n---\n\n')}`;

    return {
      success: true,
      message,
    };
  } catch (error) {
    console.error(`Error getting summaries:`, error);
    return {
      success: false,
      message: 'Failed to retrieve summaries. Please try again.',
      error: error.message,
    };
  }
}
