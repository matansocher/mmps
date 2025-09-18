import { getActiveTopicParticipation, getTopic, getTopicParticipations } from '../../../../educator/mongo';
import { TopicParticipationStatus } from '../../../../educator/types';

export async function handleGetProgress(chatId: number): Promise<string> {
  try {
    const participations = await getTopicParticipations(chatId);
    const completed = participations.filter((p) => p.status === TopicParticipationStatus.Completed).length;
    const active = participations.filter((p) => p.status === TopicParticipationStatus.Assigned).length;

    let activeTopicInfo = '';
    if (active > 0) {
      const activeParticipation = await getActiveTopicParticipation(chatId);
      if (activeParticipation) {
        const topic = await getTopic(activeParticipation.topicId);
        activeTopicInfo = `\n📖 Currently learning: **${topic?.title}**`;
      }
    }

    return `📊 **Your Learning Progress:**\n\n` + `✅ Topics completed: ${completed}\n` + `📚 Total topics studied: ${participations.length}` + activeTopicInfo;
  } catch (error) {
    console.error('Error getting progress:', error);
    return 'Failed to retrieve your progress. Please try again.';
  }
}
