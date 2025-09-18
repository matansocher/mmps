import { getResponse } from '@services/openai';
import { SUMMARY_PROMPT, SYSTEM_PROMPT } from '../../../../educator/educator.config';
import { getActiveTopicParticipation, getTopic, markTopicParticipationCompleted, saveTopicSummary } from '../../../../educator/mongo';
import { TopicSummarySchema } from '../../../../educator/types';
import { generateSummaryMessage } from '../../../../educator/utils';

export async function handleCompleteTopic(chatId: number): Promise<string> {
  try {
    const activeParticipation = await getActiveTopicParticipation(chatId);
    if (!activeParticipation) {
      return 'No active topic to complete.';
    }

    const topic = await getTopic(activeParticipation.topicId);
    await markTopicParticipationCompleted(activeParticipation._id.toString());

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

    return `✅ **Topic Completed!**\n\n${summaryMessage}\n\nGreat job! Ready for the next topic?`;
  } catch (error) {
    console.error('Error completing topic:', error);
    return 'Failed to complete the topic. Please try again.';
  }
}
