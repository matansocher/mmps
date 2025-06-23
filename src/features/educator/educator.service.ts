import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, Topic, TopicParticipation } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { OpenaiAssistantService } from '@services/openai';
import { getInlineKeyboardMarkup, sendShortenedMessage } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, EDUCATOR_ASSISTANT_ID } from './educator.config';

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
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async processTopic(chatId: number): Promise<void> {
    const activeTopic = await this.topicParticipationDB.getActiveTopicParticipation(chatId);
    if (activeTopic) {
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
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', chatId, error: 'No new topics found', chatId });
      return;
    }

    const { id: threadId } = await this.openaiAssistantService.createThread();
    const topicParticipation = await this.topicParticipationDB.createTopicParticipation(chatId, topic._id.toString(), threadId);

    await this.bot.sendMessage(chatId, [`נושא השיעור הבא שלנו:`, topic.title].join('\n'));
    const response = await this.openaiAssistantService.getAssistantAnswer(EDUCATOR_ASSISTANT_ID, threadId, [`הנושא של היום הוא`, `${topic.title}`].join(' '));
    await sendShortenedMessage(this.bot, chatId, response, { ...getBotInlineKeyboardMarkup(topicParticipation) });
  }

  async processQuestion(chatId: number, question: string, activeTopicParticipation: TopicParticipation): Promise<void> {
    const response = await this.openaiAssistantService.getAssistantAnswer(EDUCATOR_ASSISTANT_ID, activeTopicParticipation.threadId, question);
    await sendShortenedMessage(this.bot, chatId, response, { ...getBotInlineKeyboardMarkup(activeTopicParticipation) });
  }
}
