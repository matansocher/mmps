import { getActiveTopicParticipation, getTopic } from '../../../../educator/mongo';

export async function handleGetActiveTopic(chatId: number): Promise<string> {
  try {
    const activeParticipation = await getActiveTopicParticipation(chatId);
    if (!activeParticipation) {
      return 'No active topic. Would you like me to start teaching you something new?';
    }

    const topic = await getTopic(activeParticipation.topicId);
    return `📖 You're currently learning about: **${topic?.title}**\n\nFeel free to ask me questions about it or tell me when you're done!`;
  } catch (error) {
    console.error('Error getting active topic:', error);
    return 'Failed to retrieve active topic information.';
  }
}
