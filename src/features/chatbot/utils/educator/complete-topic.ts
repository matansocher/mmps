import { MY_USER_ID } from '@core/config';
import { getResponse } from '@services/openai';
import { SUMMARY_PROMPT, SYSTEM_PROMPT } from '../../../educator/educator.config';
import { getActiveTopicParticipation, getTopic, markTopicParticipationCompleted, saveTopicSummary } from '../../../educator/mongo';
import { TopicSummarySchema } from '../../../educator/types';
import { generateSummaryMessage } from '../../../educator/utils';
import { EducatorResponse } from './start-new-topic';

/**
 * Complete a topic and generate summary
 */
export async function completeTopic(): Promise<EducatorResponse> {
  try {
    const activeParticipation = await getActiveTopicParticipation(MY_USER_ID);
    if (!activeParticipation) {
      return {
        success: false,
        message: 'No active topic to complete.',
      };
    }

    const topic = await getTopic(activeParticipation.topicId);
    await markTopicParticipationCompleted(activeParticipation._id.toString());

    // Generate summary
    const { result: summaryDetails } = await getResponse({
      instructions: SYSTEM_PROMPT,
      previousResponseId: activeParticipation.previousResponseId,
      input: SUMMARY_PROMPT,
      schema: TopicSummarySchema,
    });

    await saveTopicSummary(activeParticipation, topic?.title || 'Unknown Topic', {
      summary: summaryDetails.summary,
      keyTakeaways: summaryDetails.keyTakeaways,
    });

    const summaryMessage = generateSummaryMessage({
      topicTitle: topic?.title || 'Unknown Topic',
      summary: summaryDetails.summary,
      keyTakeaways: summaryDetails.keyTakeaways,
      createdAt: new Date(),
    });

    return {
      success: true,
      message: summaryMessage,
      topic,
      participation: activeParticipation,
    };
  } catch (error) {
    console.error(`Error completing topic:`, error);
    return {
      success: false,
      message: 'Failed to complete the topic. Please try again.',
      error: error.message,
    };
  }
}
