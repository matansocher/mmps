import { promises as fs } from 'fs';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { NotifierService } from '@core/notifier';
import { deleteFile } from '@core/utils';
import { getResponse } from '@services/openai';
import { getAudioFromText } from '@services/openai';
import { getInlineKeyboardMarkup, sendStyledMessage } from '@services/telegram';
import { EMERGENCY_FALLBACK_CHALLENGE, EMERGENCY_FALLBACK_LESSON } from './content/minimal-fallback';
import { BOT_ACTIONS, BOT_CONFIG, CHALLENGE_GENERATION_PROMPT, LESSON_GENERATION_PROMPT } from './langly.config';
import { SpanishChallenge, SpanishChallengeSchema, SpanishLesson, SpanishLessonSchema } from './types';

@Injectable()
export class LanglyService {
  private readonly logger = new Logger(LanglyService.name);

  constructor(
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async generateLesson(): Promise<SpanishLesson> {
    try {
      // Generate unique content each time with varied topics
      const topics = [
        'an idiomatic expression that natives use daily',
        'a false friend that confuses English speakers',
        'regional slang from Mexico, Spain, or Argentina',
        'a colloquial phrase for social situations',
        'a cultural expression unique to Spanish-speaking countries',
        'a funny saying or proverb with an interesting origin',
        "street Spanish that textbooks don't teach",
        'a phrase that shows the Spanish sense of humor',
      ];

      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const input = `Generate a Spanish lesson about ${randomTopic}. Make it practical, fun, and culturally rich. Include pronunciation tips.`;

      const { result } = await getResponse<typeof SpanishLessonSchema>({
        instructions: LESSON_GENERATION_PROMPT,
        input,
        schema: SpanishLessonSchema,
      });
      return result;
    } catch (error) {
      this.logger.error(`Error generating lesson: ${error}`);
      // Only use fallback if API completely fails
      this.logger.warn('Using emergency fallback lesson due to API failure');
      return EMERGENCY_FALLBACK_LESSON;
    }
  }

  async generateChallenge(): Promise<SpanishChallenge> {
    try {
      // Generate unique challenges with varied scenarios
      const scenarios = [
        'ordering food at a Spanish tapas bar',
        'understanding Mexican slang in a conversation',
        'avoiding embarrassing false friends mistakes',
        'navigating Argentine Spanish variations',
        'understanding Spanish humor and wordplay',
        'using formal vs informal Spanish correctly',
        'recognizing regional differences in vocabulary',
        'understanding Spanish idioms in context',
        'decoding Spanish text message abbreviations',
        'handling real-world travel situations',
      ];

      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const input = `Create a Spanish challenge about: ${randomScenario}. Make it practical and fun with plausible wrong answers. Include a helpful hint and cultural context.`;

      const { result } = await getResponse<typeof SpanishChallengeSchema>({
        instructions: CHALLENGE_GENERATION_PROMPT,
        input,
        schema: SpanishChallengeSchema,
      });
      return result;
    } catch (error) {
      this.logger.error(`Error generating challenge: ${error}`);
      // Only use fallback if API completely fails
      this.logger.warn('Using emergency fallback challenge due to API failure');
      return EMERGENCY_FALLBACK_CHALLENGE;
    }
  }

  async sendMorningLesson(chatId: number): Promise<void> {
    try {
      const lesson = await this.generateLesson();

      // Format the lesson message
      let message = `🌞 ¡Buenos días! Today's Spanish lesson:\n\n`;
      message += `${lesson.emoji} **${lesson.topic}**\n\n`;
      message += `📝 **${lesson.spanish}**\n`;

      if (lesson.literal) {
        message += `📖 Literally: "${lesson.literal}"\n`;
      }

      message += `💡 Meaning: ${lesson.meaning}\n\n`;

      if (lesson.pronunciation) {
        message += `🗣️ Pronunciation: ${lesson.pronunciation}\n\n`;
      }

      message += `Example:\n"${lesson.example}"\n`;
      message += `(${lesson.exampleTranslation})\n`;

      if (lesson.culturalNote) {
        message += `\n🌍 ${lesson.culturalNote}`;
      }

      // Send with interactive buttons
      const buttons = [
        {
          text: '🔊 Hear pronunciation',
          callback_data: `${BOT_ACTIONS.PRONOUNCE}-${lesson.spanish.substring(0, 30)}`,
        },
        {
          text: '🎯 Try a challenge',
          callback_data: `${BOT_ACTIONS.NEXT_CHALLENGE}`,
        },
      ];

      await sendStyledMessage(this.bot, chatId, message, 'Markdown', getInlineKeyboardMarkup(buttons, 2));
    } catch (error) {
      this.logger.error(`Error sending morning lesson: ${error}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${error}` });
    }
  }

  async sendEveningChallenge(chatId: number): Promise<void> {
    try {
      const challenge = await this.generateChallenge();

      // Format challenge message
      let message = `🌙 ¡Hora del reto! Evening challenge:\n\n`;
      message += `${challenge.emoji} ${challenge.question}\n`;

      if (challenge.context) {
        message += `\n💭 ${challenge.context}\n`;
      }

      // Create answer buttons
      const answerButtons = challenge.options.map((option, index) => ({
        text: `${String.fromCharCode(65 + index)}) ${option.text}`,
        callback_data: `${BOT_ACTIONS.ANSWER}-${option.isCorrect ? 'correct' : 'wrong'}-${index}`,
      }));

      await sendStyledMessage(this.bot, chatId, message, 'Markdown', getInlineKeyboardMarkup([...answerButtons, { text: '💡 Hint', callback_data: `${BOT_ACTIONS.HINT}` }], 1));
    } catch (error) {
      this.logger.error(`Error sending evening challenge: ${error}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${error}` });
    }
  }

  async handlePronunciation(chatId: number, text: string): Promise<void> {
    try {
      const result = await getAudioFromText(text, 'es-ES');

      const audioFilePath = `${LOCAL_FILES_PATH}/langly-pronunciation-${Date.now()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.bot.sendVoice(chatId, audioFilePath, {
        caption: `🔊 Pronunciation: "${text}"`,
      });

      await deleteFile(audioFilePath);
    } catch (error) {
      this.logger.error(`Error generating pronunciation: ${error}`);
      await this.bot.sendMessage(chatId, "❌ Sorry, I couldn't generate the pronunciation.");
    }
  }

  async getRandomLesson(chatId: number): Promise<void> {
    const lesson = await this.generateLesson();

    let message = `🎲 Random Spanish lesson:\n\n`;
    message += `${lesson.emoji} **${lesson.spanish}**\n`;

    if (lesson.literal) {
      message += `📖 Literally: "${lesson.literal}"\n`;
    }

    message += `💡 Meaning: ${lesson.meaning}\n\n`;
    message += `Example:\n"${lesson.example}"\n`;
    message += `(${lesson.exampleTranslation})`;

    if (lesson.culturalNote) {
      message += `\n\n🌍 ${lesson.culturalNote}`;
    }

    const buttons = [
      {
        text: '🔊 Hear it',
        callback_data: `${BOT_ACTIONS.PRONOUNCE}-${lesson.spanish.substring(0, 30)}`,
      },
      {
        text: '🎲 Another one',
        callback_data: `${BOT_ACTIONS.NEXT_CHALLENGE}`,
      },
    ];

    await sendStyledMessage(this.bot, chatId, message, 'Markdown', getInlineKeyboardMarkup(buttons, 2));
  }

  async startChallenge(chatId: number): Promise<void> {
    // Simply send a new challenge every time
    await this.sendEveningChallenge(chatId);
  }

  async handleChallengeAnswer(chatId: number, messageId: number, isCorrect: boolean, answerIndex: number): Promise<void> {
    try {
      // Simple feedback without tracking
      const responseMessage = isCorrect ? `✅ ¡Correcto! Well done!` : `❌ Not quite right. Try another challenge to learn more!`;

      // Update the message
      await this.bot.editMessageText(responseMessage, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎯 Next challenge',
                callback_data: `${BOT_ACTIONS.NEXT_CHALLENGE}`,
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error(`Error handling challenge answer: ${error}`);
    }
  }

  async showHint(chatId: number, callbackQueryId: string): Promise<void> {
    // Simple generic hint for POC
    await this.bot.answerCallbackQuery(callbackQueryId, {
      text: '💡 Think about the context and eliminate obviously wrong answers!',
      show_alert: true,
    });
  }
}
