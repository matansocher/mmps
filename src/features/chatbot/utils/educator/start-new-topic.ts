import { MY_USER_ID } from '@core/config';
import { getResponse } from '@services/openai';
import { SYSTEM_PROMPT } from '../../../educator/educator.config';
import { createTopicParticipation, getActiveTopicParticipation, getRandomTopic, getTopic, getTopicParticipations, updatePreviousResponseId } from '../../../educator/mongo';
import { Topic, TopicParticipation, TopicResponseSchema } from '../../../educator/types';

export interface EducatorResponse {
  success: boolean;
  message: string;
  topic?: Topic;
  participation?: TopicParticipation;
  error?: string;
}

/**
 * Start a new educational topic for the user
 */
export async function startNewTopic(): Promise<EducatorResponse> {
  try {
    // Check if there's already an active topic
    const activeParticipation = await getActiveTopicParticipation(MY_USER_ID);
    if (activeParticipation) {
      const topic = await getTopic(activeParticipation.topicId);
      return {
        success: false,
        message: `You already have an active topic: "${topic?.title}". Please complete it first or continue learning about it.`,
        topic,
        participation: activeParticipation,
      };
    }

    // Get a new random topic
    const topicParticipations = await getTopicParticipations(MY_USER_ID);
    const topicsParticipated = topicParticipations.map((tp) => tp.topicId);
    const topic = await getRandomTopic(MY_USER_ID, topicsParticipated);

    if (!topic) {
      return {
        success: false,
        message: 'No new topics available. You might have completed all available topics or you can add custom topics.',
      };
    }

    // Create topic participation
    const topicParticipation = await createTopicParticipation(MY_USER_ID, topic._id.toString());

    // Generate initial teaching content
    const { id: responseId, result } = await getResponse<typeof TopicResponseSchema>({
      instructions: SYSTEM_PROMPT,
      input: `הנושא של היום הוא ${topic.title}`,
      schema: TopicResponseSchema,
    });

    await updatePreviousResponseId(topicParticipation._id.toString(), responseId);

    return {
      success: true,
      message: result.text,
      topic,
      participation: topicParticipation,
    };
  } catch (error) {
    console.error(`Error starting new topic:`, error);
    return {
      success: false,
      message: 'Failed to start a new topic. Please try again.',
      error: error.message,
    };
  }
}
