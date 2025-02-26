import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { EducatorMongoTopicService, EducatorMongoUserPreferencesService, TopicModel } from '@core/mongo/educator-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, getInlineKeyboardMarkup, sendShortenedMessage, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, EDUCATOR_ASSISTANT_ID, IDLE_DAYS_REMINDER } from './educator-bot.config';

@Injectable()
export class EducatorService {
  constructor(
    private readonly mongoTopicService: EducatorMongoTopicService,
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

    const activeTopic = await this.mongoTopicService.getActiveTopic();
    if (activeTopic) {
      if (activeTopic.assignedAt.getTime() < Date.now() - IDLE_DAYS_REMINDER * 24 * 60 * 60 * 1000) {
        await this.bot.sendMessage(chatId, `וואלה יצא הרבה זמן שלא למדת, מה אתה אומר נחזור?`);
      }
      return;
    }

    await this.startNewTopic(chatId);
  }

  async startNewTopic(chatId: number, customTopic?: string): Promise<void> {
    const topic = await this.getNewTopic(customTopic);
    if (!topic) {
      await this.bot.sendMessage(chatId, 'וואלה יש מצב שנגמרו כל הנושאים, אבל תמיד אפשר להוסיף עוד 👏');
      return;
    }
    await sendStyledMessage(this.bot, chatId, [`נושא השיעור הבא שלנו:`, `\`${topic.title}\``].join('\n'));
    const response = await this.getAssistantAnswer(topic.threadId, [`הנושא של היום הוא`, `${topic.title}`].join(' '));

    const inlineKeyboardButtons = [
      {
        text: '✅ סיימתי ✅',
        callback_data: `${topic._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendShortenedMessage(this.bot, chatId, response, inlineKeyboardMarkup);
  }

  async getNewTopic(customTopic?: string): Promise<TopicModel> {
    const topic = customTopic ? await this.mongoTopicService.createTopic(customTopic) : await this.mongoTopicService.getRandomTopic();
    if (!topic) {
      this.notifierBotService.notify(BOTS.EDUCATOR, { action: 'ERROR', error: 'No new topics found' });
      return null;
    }
    const { id: threadId } = await this.openaiAssistantService.createThread();
    topic.threadId = threadId;
    await this.mongoTopicService.startTopic(topic?._id, { threadId });
    return topic;
  }

  async getAssistantAnswer(threadId: string, prompt: string): Promise<string> {
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const threadRun = await this.openaiAssistantService.runThread(EDUCATOR_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  async processQuestion(chatId: number, question: string, activeTopic: TopicModel): Promise<void> {
    const response = await this.getAssistantAnswer(activeTopic.threadId, question);
    const inlineKeyboardButtons = [
      {
        text: '✅ סיימתי ✅',
        callback_data: `${activeTopic._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendShortenedMessage(this.bot, chatId, response, inlineKeyboardMarkup);
  }
}
