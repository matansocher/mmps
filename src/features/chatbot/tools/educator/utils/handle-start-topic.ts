import { getResponse } from '@services/openai';
import { SYSTEM_PROMPT } from '../../../../educator/educator.config';
import { createTopicParticipation, getActiveTopicParticipation, getRandomTopic, getTopic, getTopicParticipations, updatePreviousResponseId } from '../../../../educator/mongo';
import { TopicResponseSchema } from '../../../../educator/types';

export async function handleStartTopic(chatId: number): Promise<string> {
  try {
    // Check if there's already an active topic
    const activeParticipation = await getActiveTopicParticipation(chatId);
    if (activeParticipation) {
      const topic = await getTopic(activeParticipation.topicId);
      return `You already have an active topic: "${topic?.title}". Please complete it first or ask me to continue teaching about it.`;
    }

    // Get a new random topic
    const topicParticipations = await getTopicParticipations(chatId);
    const topicsParticipated = topicParticipations.map((tp) => tp.topicId);
    const topic = await getRandomTopic(chatId, topicsParticipated);

    if (!topic) {
      return 'No new topics available. You might have completed all available topics or you can add custom topics.';
    }

    // Create topic participation
    const topicParticipation = await createTopicParticipation(chatId, topic._id.toString());

    // Generate initial teaching content
    const { id: responseId, result } = await getResponse<typeof TopicResponseSchema>({
      instructions: SYSTEM_PROMPT,
      input: `הנושא של היום הוא ${topic.title}`,
      schema: TopicResponseSchema,
    });

    await updatePreviousResponseId(topicParticipation._id.toString(), responseId);

    return `📚 **נושא היום: ${topic.title}**\n\n${result.text}\n\n`;
  } catch (error) {
    console.error('Error starting topic:', error);
    return 'Failed to start a new topic. Please try again.';
  }
}
