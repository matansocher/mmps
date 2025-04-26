import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, TopicModel, TopicParticipationModel } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { OpenaiAssistantService, streamResponse } from '@services/openai';
import { getInlineKeyboardMarkup, sendShortenedMessage, StreamingHandler } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, EDUCATOR_ASSISTANT_ID } from './educator.config';

const getBotInlineKeyboardMarkup = (topicParticipation: TopicParticipationModel) => {
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
    private readonly mongoTopicService: EducatorMongoTopicService,
    private readonly mongoTopicParticipationService: EducatorMongoTopicParticipationService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async processTopic(chatId: number): Promise<void> {
    const activeTopic = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (activeTopic) {
      return;
    }

    await this.startNewTopic(chatId);
  }

  async getNewTopic(chatId: number): Promise<TopicModel> {
    const topicParticipations = await this.mongoTopicParticipationService.getTopicParticipations(chatId);
    const topicsParticipated = topicParticipations.map((topic) => topic.topicId);

    return this.mongoTopicService.getRandomTopic(chatId, topicsParticipated);
  }

  async startNewTopic(chatId: number, onDemand?: boolean): Promise<void> {
    const topic = await this.getNewTopic(chatId);
    if (!topic) {
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: 'No new topics found', chatId });
      // await this.bot.sendMessage(chatId, 'וואלה יש מצב שנגמרו כל הנושאים, אבל תמיד אפשר להוסיף עוד 👏');
      return;
    }

    const { id: threadId } = await this.openaiAssistantService.createThread();
    const topicParticipation = await this.mongoTopicParticipationService.createTopicParticipation(chatId, topic._id.toString(), threadId);

    await this.bot.sendMessage(chatId, [`נושא השיעור הבא שלנו:`, topic.title].join('\n'));
    if (onDemand) {
      await this.streamAssistantResponse(topicParticipation, [`הנושא של היום הוא`, `${topic.title}`].join(' '), chatId);
    } else {
      const response = await this.openaiAssistantService.getAssistantAnswer(EDUCATOR_ASSISTANT_ID, threadId, [`הנושא של היום הוא`, `${topic.title}`].join(' '));
      await sendShortenedMessage(this.bot, chatId, response, { ...(getBotInlineKeyboardMarkup(topicParticipation) as any) });
    }
  }

  processQuestion(chatId: number, question: string, activeTopicParticipation: TopicParticipationModel): Promise<void> {
    return this.streamAssistantResponse(activeTopicParticipation, question, chatId);
  }

  async streamAssistantResponse(topicParticipation: TopicParticipationModel, prompt: string, chatId: number): Promise<void> {
    const { threadId } = topicParticipation;
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const stream = await this.openaiAssistantService.getThreadRunStream(EDUCATOR_ASSISTANT_ID, threadId);
    let messageId: number;

    const streamingHandler = new StreamingHandler(async (content) => {
      if (!messageId) {
        const sentMessage = await this.bot.sendMessage(chatId, content || '...');
        messageId = sentMessage.message_id;
      } else {
        await this.bot.editMessageText(content, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', ...(getBotInlineKeyboardMarkup(topicParticipation) as any) });
      }
    });

    const finalContent = await streamResponse(threadId, stream, (content) => {
      streamingHandler.addContent(content);
    });

    await streamingHandler.flushFinalContent();

    if (messageId && finalContent) {
      await this.bot.editMessageText(finalContent, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', ...(getBotInlineKeyboardMarkup(topicParticipation) as any) });
    }
  }
}
