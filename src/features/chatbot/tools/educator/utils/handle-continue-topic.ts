import { SYSTEM_PROMPT } from '@features/educator/educator.config';
import { getActiveTopicParticipation, getTopic, updatePreviousResponseId } from '@features/educator/mongo';
import { TopicResponseSchema } from '@features/educator/types';
import { getResponse } from '@services/openai';

export async function handleContinueTopic(chatId: number, question: string): Promise<string> {
  try {
    const activeParticipation = await getActiveTopicParticipation(chatId);
    if (!activeParticipation) {
      return 'No active topic found. Would you like me to start a new topic?';
    }

    const topic = await getTopic(activeParticipation.topicId);
    if (!topic) {
      return 'Topic information not found.';
    }

    const { id: responseId, result } = await getResponse<typeof TopicResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: activeParticipation.previousResponseId,
      input: question,
      schema: TopicResponseSchema,
    });

    await updatePreviousResponseId(activeParticipation._id.toString(), responseId);

    return result.text;
  } catch (error) {
    console.error('Error continuing topic:', error);
    return 'Failed to process your question. Please try again.';
  }
}
