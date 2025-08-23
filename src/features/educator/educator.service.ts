import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, Topic, TopicParticipation } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { getResponse } from '@services/openai';
import { getInlineKeyboardMarkup, sendShortenedMessage } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, SUMMARY_PROMPT, SYSTEM_PROMPT } from './educator.config';
import { TopicResponseSchema, TopicSummarySchema } from './types';
import { getSummaryMessage } from './utils';

const getBotInlineKeyboardMarkup = (topicParticipation: TopicParticipation) => {
  const inlineKeyboardButtons = [
    {
      text: '🎧 הקראה 🎧',
      callback_data: `${BOT_ACTIONS.TRANSCRIBE} - ${topicParticipation._id}`,
    },
    {
      text: '✅ סיימתי ✅',
      callback_data: `${BOT_ACTIONS.COMPLETE} - ${topicParticipation._id}`,
    },
  ];
  return getInlineKeyboardMarkup(inlineKeyboardButtons);
};

@Injectable()
export class EducatorService {
  constructor(
    private readonly topicDB: EducatorMongoTopicService,
    private readonly topicParticipationDB: EducatorMongoTopicParticipationService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async handleTopicReminders(topicParticipation: TopicParticipation): Promise<void> {
    await this.bot.sendMessage(topicParticipation.chatId, getSummaryMessage(topicParticipation.summaryDetails), { parse_mode: 'Markdown' });
    await this.topicParticipationDB.saveSummarySent(topicParticipation._id.toString());
  }

  async processTopic(chatId: number): Promise<void> {
    const topicParticipation = await this.topicParticipationDB.getActiveTopicParticipation(chatId);
    if (topicParticipation) {
      return;
    }

    await this.startNewTopic(chatId);
  }

  async getNewTopic(chatId: number): Promise<Topic> {
    const topicParticipations = await this.topicParticipationDB.getTopicParticipations(chatId);
    const topicsParticipated = topicParticipations.map((topic) => topic.topicId);

    return this.topicDB.getRandomTopic(chatId, topicsParticipated);
  }

  async startNewTopic(chatId: number): Promise<void> {
    const topic = await this.getNewTopic(chatId);
    if (!topic) {
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', chatId, error: 'No new topics found' });
      return;
    }

    const topicParticipation = await this.topicParticipationDB.createTopicParticipation(chatId, topic._id.toString());

    await this.bot.sendMessage(chatId, [`נושא השיעור הבא שלנו:`, topic.title].join('\n'));
    await this.processQuestion(chatId, topicParticipation, [`הנושא של היום הוא`, `${topic.title}`].join(' '));
  }

  async processQuestion(chatId: number, topicParticipation: TopicParticipation, question: string): Promise<void> {
    const { id: responseId, result } = await getResponse<typeof TopicResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: topicParticipation.previousResponseId,
      input: question,
      schema: TopicResponseSchema,
    });
    await this.topicParticipationDB.updatePreviousResponseId(topicParticipation._id.toString(), responseId);
    const { message_id: messageId } = await sendShortenedMessage(this.bot, chatId, result.text, { ...getBotInlineKeyboardMarkup(topicParticipation) });
    this.topicParticipationDB.saveMessageId(topicParticipation._id.toString(), messageId);
  }

  async generateTopicSummary(topicParticipationId: string): Promise<void> {
    const topicParticipation = await this.topicParticipationDB.getTopicParticipation(topicParticipationId);
    const topic = await this.topicDB.getTopic(topicParticipation.topicId);
    if (!topic) {
      return;
    }

    const { result: summaryDetails } = await getResponse({
      instructions: SYSTEM_PROMPT,
      previousResponseId: topicParticipation.previousResponseId,
      input: SUMMARY_PROMPT,
      schema: TopicSummarySchema,
    });

    await this.topicParticipationDB.saveTopicSummary(topicParticipation, topic.title, { summary: summaryDetails.summary, keyTakeaways: summaryDetails.keyTakeaways });
  }
}
