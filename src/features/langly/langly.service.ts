import { promises as fs } from 'fs';
import { InputFile } from 'grammy';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { getResponse } from '@services/openai';
import { getAudioFromText } from '@services/openai';
import { buildInlineKeyboard, provideTelegramBot } from '@services/telegram-grammy';
import {
  cleanupOldChallenges,
  createActiveChallenge,
  DifficultyLevel,
  getActiveChallenge,
  getUserPreference,
  LanguageChallenge,
  LanguageChallengeSchema,
  LANGUAGES,
  updatePreviousResponseId,
} from '@shared/langly';
import { BOT_ACTIONS, BOT_CONFIG, getDifficultyPrompt, INLINE_KEYBOARD_SEPARATOR, LANGUAGE_LABELS } from './langly.config';

export class LanglyService {
  private readonly logger = new Logger(LanglyService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  async generateChallenge(chatId: number): Promise<LanguageChallenge> {
    const userPreference = await getUserPreference(chatId);
    const previousResponseId = userPreference?.previousResponseId;
    const difficulty = userPreference?.difficulty ?? DifficultyLevel.INTERMEDIATE;
    const language = userPreference?.language ?? LANGUAGES.SPANISH;

    const prompt = getDifficultyPrompt(difficulty, language);

    const { id: responseId, result } = await getResponse<typeof LanguageChallengeSchema>({
      input: `Generate a unique ${language} language challenge appropriate for the specified difficulty level. Ensure this challenge is completely different from any previous ones.`,
      instructions: prompt,
      schema: LanguageChallengeSchema,
      store: true,
      previousResponseId,
      temperature: 1.2,
    });

    await updatePreviousResponseId(chatId, responseId);
    return result;
  }

  async sendChallenge(chatId: number): Promise<void> {
    const challenge = await this.generateChallenge(chatId);
    const userPreference = await getUserPreference(chatId);
    const language = userPreference?.language ?? LANGUAGES.SPANISH;
    const languageLabel = LANGUAGE_LABELS[language] || 'Language';

    const keyboard = buildInlineKeyboard(challenge.options.map((option, index) => ({ text: option.text, data: [BOT_ACTIONS.ANSWER, index, option.isCorrect].join(INLINE_KEYBOARD_SEPARATOR) })));

    const questionMessage = [`${challenge.emoji} *${languageLabel} Challenge*`, '', `📝 *${challenge.question}*`, '', `💡 _Choose the correct answer:_`].join('\n');
    const sentMessage = await this.bot.api.sendMessage(chatId, questionMessage, { parse_mode: 'Markdown', reply_markup: keyboard });

    await createActiveChallenge(chatId, sentMessage.message_id, challenge);

    // Cleanup old challenges periodically
    await cleanupOldChallenges();
  }

  async handleAnswer(chatId: number, messageId: number, answerIndex: number, isCorrect: boolean): Promise<{ word: string; type: string; isCorrect: boolean } | null> {
    const activeChallenge = await getActiveChallenge(chatId, messageId);

    if (!activeChallenge) {
      return null;
    }

    const { challenge } = activeChallenge;
    const selectedAnswer = challenge.options[answerIndex];

    const userPreference = await getUserPreference(chatId);
    const language = userPreference?.language ?? LANGUAGES.SPANISH;
    const languageLabel = LANGUAGE_LABELS[language] || 'Language';

    const resultMessage = [`${challenge.emoji} *${languageLabel} Challenge*`, '', `📝 *${challenge.question}*`, '', `Your answer: *${selectedAnswer.text}* ${isCorrect ? '✅' : '❌'}`].join('\n');
    await this.bot.api.editMessageText(chatId, messageId, resultMessage, { parse_mode: 'Markdown' });

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

    const challengeKey = `${chatId}_${messageId}`;
    const audioKeyboard = buildInlineKeyboard([{ text: '🔊 Listen to pronunciation', data: [BOT_ACTIONS.AUDIO, challengeKey].join(INLINE_KEYBOARD_SEPARATOR) }]);

    await this.bot.api.sendMessage(chatId, explanationMessage, { parse_mode: 'Markdown', reply_markup: audioKeyboard });

    return { word: challenge.word, type: challenge.type, isCorrect };
  }

  async sendAudioPronunciation(chatId: number, originalMessageId: number, challengeKey: string): Promise<void> {
    // Parse challengeKey to get chatId and messageId
    const [, messageIdStr] = challengeKey.split('_');
    const messageId = parseInt(messageIdStr);

    const activeChallenge = await getActiveChallenge(chatId, messageId);

    if (!activeChallenge) {
      return;
    }

    const { challenge } = activeChallenge;

    try {
      await this.bot.api.editMessageReplyMarkup(chatId, originalMessageId).catch(() => {});

      const audioPath = `${LOCAL_FILES_PATH}/langly_audio_${Date.now()}.mp3`;
      const audioResponse = await getAudioFromText(challenge.exampleSentence);

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      await fs.writeFile(audioPath, audioBuffer);

      await this.bot.api.sendVoice(chatId, new InputFile(audioPath), { caption: `🔊 "${challenge.exampleSentence}"` });

      await deleteFile(audioPath);
    } catch (err) {
      this.logger.error(`Failed to generate audio ${err}`);
      await this.bot.api.sendMessage(chatId, '❌ Failed to generate audio. Please try again.');
    }
  }
}
