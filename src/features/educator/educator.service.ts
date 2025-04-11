import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, TopicModel, TopicParticipationModel } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, getInlineKeyboardMarkup, sendShortenedMessage, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, EDUCATOR_ASSISTANT_ID } from './educator.config';

@Injectable()
export class EducatorService {
  constructor(
    private readonly mongoTopicService: EducatorMongoTopicService,
    private readonly mongoTopicParticipationService: EducatorMongoTopicParticipationService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifier: NotifierService,
    @Inject(BOTS.EDUCATOR.id) private readonly bot: TelegramBot,
  ) {}

  async processTopic(chatId: number): Promise<void> {
    const activeTopic = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (activeTopic) {
      return;
    }

    await this.startNewTopic(chatId);
  }

  async startNewTopic(chatId: number, customTopic?: string): Promise<void> {
    const topic = await this.getNewTopic(chatId, customTopic);
    if (!topic) {
      this.notifier.notify(BOTS.EDUCATOR, { action: 'ERROR', error: 'No new topics found', chatId });
      // await this.bot.sendMessage(chatId, 'וואלה יש מצב שנגמרו כל הנושאים, אבל תמיד אפשר להוסיף עוד 👏');
      return;
    }

    const { id: threadId } = await this.openaiAssistantService.createThread();
    const topicParticipation = await this.mongoTopicParticipationService.createTopicParticipation(chatId, topic._id.toString());
    await this.mongoTopicParticipationService.startTopicParticipation(topicParticipation?._id, { threadId });

    const response = await this.getAssistantAnswer(threadId, [`הנושא של היום הוא`, `${topic.title}`].join(' '));
    await sendStyledMessage(this.bot, chatId, [`נושא השיעור הבא שלנו:`, `\`${topic.title}\``].join('\n'));

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
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendShortenedMessage(this.bot, chatId, response, inlineKeyboardMarkup);
  }

  async getNewTopic(chatId: number, customTopic?: string): Promise<TopicModel> {
    const topicParticipations = await this.mongoTopicParticipationService.getTopicParticipations(chatId);
    const topicsParticipated = topicParticipations.map((topic) => topic.topicId);

    return customTopic ? await this.mongoTopicService.createTopic(chatId, customTopic) : await this.mongoTopicService.getRandomTopic(chatId, topicsParticipated);
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
        text: '🎧 הקראה 🎧',
        callback_data: `${BOT_ACTIONS.TRANSCRIBE} - ${activeTopicParticipation._id}`,
      },
      {
        text: '✅ סיימתי ✅',
        callback_data: `${BOT_ACTIONS.COMPLETE} - ${activeTopicParticipation._id}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendShortenedMessage(this.bot, chatId, response, inlineKeyboardMarkup);
  }
}
