import { MY_USER_ID } from '@core/config';
import { getResponse } from '@services/openai';
import { SYSTEM_PROMPT } from '../../../educator/educator.config';
import { getActiveTopicParticipation, getTopic, updatePreviousResponseId } from '../../../educator/mongo';
import { TopicResponseSchema } from '../../../educator/types';
import { EducatorResponse } from './start-new-topic';

/**
 * Continue an active topic with a user's question
 */
export async function continueTopicDiscussion(question: string): Promise<EducatorResponse> {
  try {
    const activeParticipation = await getActiveTopicParticipation(MY_USER_ID);
    if (!activeParticipation) {
      return {
        success: false,
        message: 'No active topic found. Would you like to start a new topic?',
      };
    }

    const topic = await getTopic(activeParticipation.topicId);
    if (!topic) {
      return {
        success: false,
        message: 'Topic information not found.',
      };
    }

    // Generate response for the question
    const { id: responseId, result } = await getResponse<typeof TopicResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: activeParticipation.previousResponseId,
      input: question,
      schema: TopicResponseSchema,
    });

    await updatePreviousResponseId(activeParticipation._id.toString(), responseId);

    return {
      success: true,
      message: result.text,
      topic,
      participation: activeParticipation,
    };
  } catch (error) {
    console.error(`Error continuing topic:`, error);
    return {
      success: false,
      message: 'Failed to process your question. Please try again.',
      error: error.message,
    };
  }
}
