import { promises as fs } from 'fs';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { deleteFile } from '@core/utils';
import { getResponse } from '@services/openai';
import { getAudioFromText } from '@services/openai';
import { getInlineKeyboardMarkup } from '@services/telegram';
import { getUserPreference, updatePreviousResponseId } from '@shared/langly';
import { BOT_ACTIONS, BOT_CONFIG, CHALLENGE_GENERATION_PROMPT, INLINE_KEYBOARD_SEPARATOR } from './langly.config';
import { ActiveChallenge, SpanishChallenge, SpanishChallengeSchema } from './types';

@Injectable()
export class LanglyService {
  private readonly logger = new Logger(LanglyService.name);
  private activeChallenges: Map<string, ActiveChallenge> = new Map();

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  async generateChallenge(chatId: number): Promise<SpanishChallenge> {
    const userPreference = await getUserPreference(chatId);
    const previousResponseId = userPreference?.previousResponseId;

    const { id: responseId, result } = await getResponse<typeof SpanishChallengeSchema>({
      input: 'Generate a unique Spanish language challenge for an intermediate learner. Ensure this challenge is completely different from any previous ones.',
      instructions: CHALLENGE_GENERATION_PROMPT,
      schema: SpanishChallengeSchema,
      store: true,
      previousResponseId,
      temperature: 1.2,
    });

    await updatePreviousResponseId(chatId, responseId);
    return result;
  }

  async sendChallenge(chatId: number): Promise<void> {
    const challenge = await this.generateChallenge(chatId);

    const inlineKeyboardButtons = challenge.options.map((option, index) => ({
      text: option.text,
      callback_data: [BOT_ACTIONS.ANSWER, index, option.isCorrect].join(INLINE_KEYBOARD_SEPARATOR),
    }));

    const questionMessage = [`${challenge.emoji} *Spanish Challenge*`, '', `📝 *${challenge.question}*`, '', `💡 _Choose the correct answer:_`].join('\n');
    const sentMessage = await this.bot.sendMessage(chatId, questionMessage, { parse_mode: 'Markdown', ...getInlineKeyboardMarkup(inlineKeyboardButtons) });

    const challengeKey = `${chatId}_${sentMessage.message_id}`;
    this.activeChallenges.set(challengeKey, { chatId, messageId: sentMessage.message_id, challenge, timestamp: new Date() });

    this.cleanupOldChallenges();
  }

  async handleAnswer(chatId: number, messageId: number, answerIndex: number, isCorrect: boolean): Promise<{ word: string; type: string; isCorrect: boolean } | null> {
    const challengeKey = `${chatId}_${messageId}`;
    const activeChallenge = this.activeChallenges.get(challengeKey);

    if (!activeChallenge) {
      return null;
    }

    const { challenge } = activeChallenge;
    const selectedAnswer = challenge.options[answerIndex];

    const resultMessage = [`${challenge.emoji} *Spanish Challenge*`, '', `📝 *${challenge.question}*`, '', `Your answer: *${selectedAnswer.text}* ${isCorrect ? '✅' : '❌'}`].join('\n');
    await this.bot.editMessageText(resultMessage, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });

    const explanationMessage = [
      `${isCorrect ? '🎉 Correct!' : '💭 Not quite right!'}`,
      '',
      `The correct answer is: *${challenge.translation}*`,
      '',
      `📚 *Explanation:*`,
      challenge.explanation,
      '',
      `📖 *Example:*`,
      `_"${challenge.exampleSentence}"_`,
      `→ "${challenge.exampleTranslation}"`,
    ].join('\n');

    const audioButton = {
      text: '🔊 Listen to pronunciation',
      callback_data: `${BOT_ACTIONS.AUDIO}${INLINE_KEYBOARD_SEPARATOR}${challengeKey}`,
    };

    await this.bot.sendMessage(chatId, explanationMessage, { parse_mode: 'Markdown', ...getInlineKeyboardMarkup([audioButton]) });

    return { word: challenge.word, type: challenge.type, isCorrect };
  }

  async sendAudioPronunciation(chatId: number, challengeKey: string): Promise<void> {
    const activeChallenge = this.activeChallenges.get(challengeKey);

    if (!activeChallenge) {
      return;
    }

    const { challenge } = activeChallenge;

    try {
      const audioPath = `${LOCAL_FILES_PATH}/langly_audio_${Date.now()}.mp3`;
      const audioResponse = await getAudioFromText(challenge.exampleSentence);

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      await fs.writeFile(audioPath, audioBuffer);

      await this.bot.sendVoice(chatId, audioPath, { caption: `🔊 "${challenge.exampleSentence}"` });

      await deleteFile(audioPath);
    } catch (err) {
      this.logger.error(`Failed to generate audio ${err}`);
      await this.bot.sendMessage(chatId, '❌ Failed to generate audio. Please try again.');
    }
  }

  private cleanupOldChallenges(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [key, challenge] of this.activeChallenges.entries()) {
      if (challenge.timestamp < oneHourAgo) {
        this.activeChallenges.delete(key);
      }
    }
  }
}
