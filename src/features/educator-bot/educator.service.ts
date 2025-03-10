import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, EducatorMongoUserPreferencesService, TopicModel, TopicParticipationModel } from '@core/mongo/educator-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, getInlineKeyboardMarkup, sendShortenedMessage, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, EDUCATOR_ASSISTANT_ID, IDLE_DAYS_REMINDER } from './educator-bot.config';

@Injectable()
export class EducatorService {
  constructor(
    private readonly mongoTopicService: EducatorMongoTopicService,
    private readonly mongoTopicParticipationService: EducatorMongoTopicParticipationService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly mongoUserPreferencesService: EducatorMongoUserPreferencesService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.EDUCATOR.id) private readonly bot: TelegramBot,
  ) {}

  async processTopic(chatId: number): Promise<void> {
    const userPreferences = await this.mongoUserPreferencesService.getUserPreference(chatId);
    if (userPreferences?.isStopped) {
      return;
    }

    const activeTopic = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (activeTopic) {
      if (activeTopic.assignedAt.getTime() < Date.now() - IDLE_DAYS_REMINDER * 24 * 60 * 60 * 1000) {
        await this.bot.sendMessage(chatId, `וואלה יצא הרבה זמן שלא למדת, מה אתה אומר נחזור?`);
      }
      return;
    }

    await this.startNewTopic(chatId);
  }

  async startNewTopic(chatId: number, customTopic?: string): Promise<void> {
    const { topic, topicParticipation } = await this.getNewTopic(chatId, customTopic);
    if (!topic) {
      await this.bot.sendMessage(chatId, 'וואלה יש מצב שנגמרו כל הנושאים, אבל תמיד אפשר להוסיף עוד 👏');
      return;
    }
    await sendStyledMessage(this.bot, chatId, [`נושא השיעור הבא שלנו:`, `\`${topic.title}\``].join('\n'));
    const response = await this.getAssistantAnswer(topicParticipation.threadId, [`הנושא של היום הוא`, `${topic.title}`].join(' '));

    const inlineKeyboardButtons = [
      {
        text: '✅ סיימתי ✅',
        callback_data: `${topicParticipation._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendShortenedMessage(this.bot, chatId, response, inlineKeyboardMarkup);
  }

  async getNewTopic(chatId: number, customTopic?: string): Promise<{ topic: TopicModel; topicParticipation: TopicParticipationModel }> {
    const topicParticipations = await this.mongoTopicParticipationService.getTopicParticipations(chatId);
    const topicsParticipated = topicParticipations.map((topic) => topic.topicId);

    const topic = customTopic ? await this.mongoTopicService.createTopic(chatId, customTopic) : await this.mongoTopicService.getRandomTopic(chatId, topicsParticipated);
    if (!topic) {
      this.notifierBotService.notify(BOTS.EDUCATOR, { action: 'ERROR', error: 'No new topics found' });
      return null;
    }

    const { id: threadId } = await this.openaiAssistantService.createThread();
    const topicParticipation = await this.mongoTopicParticipationService.createTopicParticipation(chatId, topic._id.toString());
    topicParticipation.threadId = threadId;
    await this.mongoTopicParticipationService.startTopicParticipation(topicParticipation?._id, { threadId });
    return { topic, topicParticipation };
  }

  async getAssistantAnswer(threadId: string, prompt: string): Promise<string> {
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const threadRun = await this.openaiAssistantService.runThread(EDUCATOR_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  async processQuestion(chatId: number, question: string, activeTopicParticipation: TopicParticipationModel): Promise<void> {
    const response = await this.getAssistantAnswer(activeTopicParticipation.threadId, question);
    const inlineKeyboardButtons = [
      {
        text: '✅ סיימתי ✅',
        callback_data: `${activeTopicParticipation._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendShortenedMessage(this.bot, chatId, response, inlineKeyboardMarkup);
  }
}
