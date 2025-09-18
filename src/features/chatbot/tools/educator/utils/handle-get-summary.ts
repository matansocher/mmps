import { getTopic, getTopicParticipations } from '../../../../educator/mongo';
import { TopicParticipationStatus } from '../../../../educator/types';

export async function handleGetSummary(chatId: number): Promise<string> {
  try {
    const participations = await getTopicParticipations(chatId);
    const completedParticipations = participations.filter((p) => p.status === TopicParticipationStatus.Completed);

    if (completedParticipations.length === 0) {
      return "You haven't completed any topics yet.";
    }

    const summaries = await Promise.all(
      completedParticipations.slice(-5).map(async (p) => {
        const topic = await getTopic(p.topicId);
        if (p.summaryDetails) {
          return `**${topic?.title}**\n${p.summaryDetails.summary}`;
        }
        return `**${topic?.title}** - No summary available`;
      }),
    );

    return `📚 **Your Recent Learning Summaries:**\n\n${summaries.join('\n\n---\n\n')}`;
  } catch (error) {
    console.error('Error getting summaries:', error);
    return 'Failed to retrieve summaries. Please try again.';
  }
}
