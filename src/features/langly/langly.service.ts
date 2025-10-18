import { promises as fs } from 'fs';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { deleteFile } from '@core/utils';
import { getResponse } from '@services/openai';
import { getAudioFromText } from '@services/openai';
import { getInlineKeyboardMarkup } from '@services/telegram';
import { cleanupOldChallenges, createActiveChallenge, DifficultyLevel, getActiveChallenge, getUserPreference, Language, updatePreviousResponseId } from '@shared/langly';
import {
  BOT_ACTIONS,
  BOT_CONFIG,
  getContextMatchingPrompt,
  getDialoguePrompt,
  getDifficultyPrompt,
  getFillInBlankPrompt,
  getSynonymAntonymPrompt,
  INLINE_KEYBOARD_SEPARATOR,
  LANGUAGE_LABELS,
} from './langly.config';
import {
  Challenge,
  ChallengeType,
  ContextMatchingChallenge,
  ContextMatchingChallengeSchema,
  DialogueChallenge,
  DialogueChallengeSchema,
  FillInBlankChallenge,
  FillInBlankChallengeSchema,
  MultipleChoiceChallenge,
  MultipleChoiceChallengeSchema,
  SynonymAntonymChallenge,
  SynonymAntonymChallengeSchema,
} from './types';

@Injectable()
export class LanglyService {
  private readonly logger = new Logger(LanglyService.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  /**
   * Randomly selects a challenge type for variety, respecting user preferences
   */
  private getRandomChallengeType(preferredTypes?: string[]): ChallengeType {
    let challengeTypes = [ChallengeType.MULTIPLE_CHOICE, ChallengeType.FILL_IN_BLANK, ChallengeType.DIALOGUE, ChallengeType.CONTEXT_MATCHING, ChallengeType.SYNONYM_ANTONYM];

    // Filter by user preferences if they exist
    if (preferredTypes && preferredTypes.length > 0) {
      const filteredTypes = challengeTypes.filter((type) => preferredTypes.includes(type));
      if (filteredTypes.length > 0) {
        challengeTypes = filteredTypes;
      }
    }

    const randomIndex = Math.floor(Math.random() * challengeTypes.length);
    return challengeTypes[randomIndex];
  }

  /**
   * Gets the appropriate prompt and schema for a challenge type
   */
  private getChallengeConfig(challengeType: ChallengeType, difficulty: number, language: Language) {
    switch (challengeType) {
      case ChallengeType.FILL_IN_BLANK:
        return {
          prompt: getFillInBlankPrompt(difficulty, language),
          schema: FillInBlankChallengeSchema,
          input: `Generate a unique fill-in-the-blank ${language} challenge appropriate for the specified difficulty level. Ensure this challenge is completely different from any previous ones.`,
        };

      case ChallengeType.DIALOGUE:
        return {
          prompt: getDialoguePrompt(difficulty, language),
          schema: DialogueChallengeSchema,
          input: `Generate a unique dialogue completion ${language} challenge with a realistic conversational situation. Ensure this challenge is completely different from any previous ones.`,
        };

      case ChallengeType.CONTEXT_MATCHING:
        return {
          prompt: getContextMatchingPrompt(difficulty, language),
          schema: ContextMatchingChallengeSchema,
          input: `Generate a unique context-matching ${language} challenge that tests understanding of when to use specific expressions. Ensure this challenge is completely different from any previous ones.`,
        };

      case ChallengeType.SYNONYM_ANTONYM:
        return {
          prompt: getSynonymAntonymPrompt(difficulty, language),
          schema: SynonymAntonymChallengeSchema,
          input: `Generate a unique synonym or antonym ${language} challenge that builds vocabulary connections. Ensure this challenge is completely different from any previous ones.`,
        };

      case ChallengeType.MULTIPLE_CHOICE:
      default:
        return {
          prompt: getDifficultyPrompt(difficulty, language),
          schema: MultipleChoiceChallengeSchema,
          input: `Generate a unique ${language} language challenge appropriate for the specified difficulty level. Ensure this challenge is completely different from any previous ones.`,
        };
    }
  }

  async generateChallenge(chatId: number, challengeType?: ChallengeType): Promise<Challenge> {
    const userPreference = await getUserPreference(chatId);
    const previousResponseId = userPreference?.previousResponseId;
    const difficulty = userPreference?.difficulty ?? DifficultyLevel.INTERMEDIATE;
    const language = userPreference?.language ?? Language.SPANISH;
    const preferredChallengeTypes = userPreference?.preferredChallengeTypes;

    // Use provided challenge type or randomly select one based on user preferences
    const selectedChallengeType = challengeType ?? this.getRandomChallengeType(preferredChallengeTypes);
    const { prompt, schema, input } = this.getChallengeConfig(selectedChallengeType, difficulty, language);

    const { id: responseId, result } = await getResponse<typeof schema>({
      input,
      instructions: prompt,
      schema: schema as any,
      store: true,
      previousResponseId,
      temperature: 1.2,
    });

    await updatePreviousResponseId(chatId, responseId);
    return result as Challenge;
  }

  /**
   * Formats the challenge message based on challenge type
   */
  private formatChallengeMessage(challenge: Challenge, languageLabel: string): string {
    switch (challenge.challengeType) {
      case ChallengeType.FILL_IN_BLANK: {
        const fillInBlank = challenge as FillInBlankChallenge;
        return [`${fillInBlank.emoji} *${languageLabel} Challenge - Fill in the Blank*`, '', `📝 *${fillInBlank.sentence}*`, '', `💡 _Choose the correct word/phrase:_`].join('\n');
      }

      case ChallengeType.DIALOGUE: {
        const dialogue = challenge as DialogueChallenge;
        return [
          `${dialogue.emoji} *${languageLabel} Challenge - Dialogue*`,
          '',
          `🎬 _${dialogue.context}_`,
          '',
          `*A:* ${dialogue.speakerA}`,
          `   _"${dialogue.speakerATranslation}"_`,
          '',
          `❓ ${dialogue.question}`,
          '',
          `💡 _Choose the best response:_`,
        ].join('\n');
      }

      case ChallengeType.CONTEXT_MATCHING: {
        const context = challenge as ContextMatchingChallenge;
        return [
          `${context.emoji} *${languageLabel} Challenge - Context Matching*`,
          '',
          `🎯 *"${context.word}"*`,
          `   _${context.translation}_`,
          '',
          `📝 *${context.question}*`,
          '',
          `💡 _Choose the appropriate context:_`,
        ].join('\n');
      }

      case ChallengeType.SYNONYM_ANTONYM: {
        const synonym = challenge as SynonymAntonymChallenge;
        const typeLabel = synonym.questionType === 'synonym' ? 'Synonym' : 'Antonym';
        return [
          `${synonym.emoji} *${languageLabel} Challenge - ${typeLabel}*`,
          '',
          `🎯 *${synonym.targetWord}*`,
          `   _${synonym.targetTranslation}_`,
          '',
          `📝 *${synonym.question}*`,
          '',
          `💡 _Choose the correct answer:_`,
        ].join('\n');
      }

      case ChallengeType.MULTIPLE_CHOICE:
      default: {
        const multipleChoice = challenge as MultipleChoiceChallenge;
        return [`${multipleChoice.emoji} *${languageLabel} Challenge*`, '', `📝 *${multipleChoice.question}*`, '', `💡 _Choose the correct answer:_`].join('\n');
      }
    }
  }

  async sendChallenge(chatId: number, challengeType?: ChallengeType): Promise<void> {
    const challenge = await this.generateChallenge(chatId, challengeType);
    const userPreference = await getUserPreference(chatId);
    const language = userPreference?.language ?? Language.SPANISH;
    const languageLabel = LANGUAGE_LABELS[language] || 'Language';

    const inlineKeyboardButtons = challenge.options.map((option, index) => ({
      text: option.text,
      callback_data: [BOT_ACTIONS.ANSWER, index, option.isCorrect].join(INLINE_KEYBOARD_SEPARATOR),
    }));

    const questionMessage = this.formatChallengeMessage(challenge, languageLabel);
    const sentMessage = await this.bot.sendMessage(chatId, questionMessage, { parse_mode: 'Markdown', ...getInlineKeyboardMarkup(inlineKeyboardButtons) });

    await createActiveChallenge(chatId, sentMessage.message_id, challenge);

    // Cleanup old challenges periodically
    await cleanupOldChallenges();
  }

  /**
   * Formats the result message based on challenge type
   */
  private formatResultMessage(challenge: Challenge, selectedAnswer: any, isCorrect: boolean, languageLabel: string): string {
    switch (challenge.challengeType) {
      case ChallengeType.FILL_IN_BLANK: {
        const fillInBlank = challenge as FillInBlankChallenge;
        return [
          `${fillInBlank.emoji} *${languageLabel} Challenge - Fill in the Blank*`,
          '',
          `📝 *${fillInBlank.sentence}*`,
          '',
          `Your answer: *${selectedAnswer.text}* ${isCorrect ? '✅' : '❌'}`,
        ].join('\n');
      }

      case ChallengeType.DIALOGUE: {
        const dialogue = challenge as DialogueChallenge;
        return [
          `${dialogue.emoji} *${languageLabel} Challenge - Dialogue*`,
          '',
          `🎬 _${dialogue.context}_`,
          '',
          `*A:* ${dialogue.speakerA}`,
          `*B:* ${selectedAnswer.text} ${isCorrect ? '✅' : '❌'}`,
        ].join('\n');
      }

      case ChallengeType.CONTEXT_MATCHING: {
        const context = challenge as ContextMatchingChallenge;
        return [
          `${context.emoji} *${languageLabel} Challenge - Context Matching*`,
          '',
          `🎯 *"${context.word}"*`,
          '',
          `📝 *${context.question}*`,
          '',
          `Your answer: *${selectedAnswer.text}* ${isCorrect ? '✅' : '❌'}`,
        ].join('\n');
      }

      case ChallengeType.SYNONYM_ANTONYM: {
        const synonym = challenge as SynonymAntonymChallenge;
        const typeLabel = synonym.questionType === 'synonym' ? 'Synonym' : 'Antonym';
        return [
          `${synonym.emoji} *${languageLabel} Challenge - ${typeLabel}*`,
          '',
          `🎯 *${synonym.targetWord}*`,
          '',
          `📝 *${synonym.question}*`,
          '',
          `Your answer: *${selectedAnswer.text}* ${isCorrect ? '✅' : '❌'}`,
        ].join('\n');
      }

      case ChallengeType.MULTIPLE_CHOICE:
      default: {
        const multipleChoice = challenge as MultipleChoiceChallenge;
        return [`${multipleChoice.emoji} *${languageLabel} Challenge*`, '', `📝 *${multipleChoice.question}*`, '', `Your answer: *${selectedAnswer.text}* ${isCorrect ? '✅' : '❌'}`].join('\n');
      }
    }
  }

  /**
   * Formats the explanation message based on challenge type
   */
  private formatExplanationMessage(challenge: Challenge, isCorrect: boolean): string {
    const correctAnswer = challenge.options.find((opt) => opt.isCorrect);

    switch (challenge.challengeType) {
      case ChallengeType.FILL_IN_BLANK: {
        const fillInBlank = challenge as FillInBlankChallenge;
        return [
          `${isCorrect ? '🎉 Correct!' : '💭 Not quite right!'}`,
          '',
          `The correct answer is: *${correctAnswer?.text}*`,
          `→ _"${fillInBlank.translation}"_`,
          '',
          `📚 *Explanation:*`,
          fillInBlank.explanation,
          '',
          `📖 *Complete sentence:*`,
          `_"${fillInBlank.sentenceTranslation}"_`,
        ].join('\n');
      }

      case ChallengeType.DIALOGUE: {
        const dialogue = challenge as DialogueChallenge;
        const correctOption = dialogue.options.find((opt) => opt.isCorrect);
        return [
          `${isCorrect ? '🎉 Correct!' : '💭 Not quite right!'}`,
          '',
          `The best response is: *${correctOption?.text}*`,
          `→ _"${correctOption?.translation}"_`,
          '',
          `📚 *Explanation:*`,
          dialogue.explanation,
        ].join('\n');
      }

      case ChallengeType.CONTEXT_MATCHING: {
        const context = challenge as ContextMatchingChallenge;
        return [
          `${isCorrect ? '🎉 Correct!' : '💭 Not quite right!'}`,
          '',
          `The correct context is: *${correctAnswer?.text}*`,
          '',
          `📚 *Explanation:*`,
          context.explanation,
          '',
          `📖 *Example:*`,
          `_"${context.exampleSentence}"_`,
          `→ "${context.exampleTranslation}"`,
        ].join('\n');
      }

      case ChallengeType.SYNONYM_ANTONYM: {
        const synonym = challenge as SynonymAntonymChallenge;
        const correctOption = synonym.options.find((opt) => opt.isCorrect);
        return [
          `${isCorrect ? '🎉 Correct!' : '💭 Not quite right!'}`,
          '',
          `The correct answer is: *${correctOption?.text}*`,
          `→ _"${correctOption?.translation}"_`,
          '',
          `📚 *Explanation:*`,
          synonym.explanation,
          '',
          `📖 *Example:*`,
          `_"${synonym.exampleSentence}"_`,
          `→ "${synonym.exampleTranslation}"`,
        ].join('\n');
      }

      case ChallengeType.MULTIPLE_CHOICE:
      default: {
        const multipleChoice = challenge as MultipleChoiceChallenge;
        return [
          `${isCorrect ? '🎉 Correct!' : '💭 Not quite right!'}`,
          '',
          `The correct answer is: *${multipleChoice.translation}*`,
          '',
          `📚 *Explanation:*`,
          multipleChoice.explanation,
          '',
          `📖 *Example:*`,
          `_"${multipleChoice.exampleSentence}"_`,
          `→ "${multipleChoice.exampleTranslation}"`,
        ].join('\n');
      }
    }
  }

  /**
   * Gets the audio text based on challenge type
   */
  private getAudioText(challenge: Challenge): string {
    switch (challenge.challengeType) {
      case ChallengeType.FILL_IN_BLANK:
        return (challenge as FillInBlankChallenge).sentence.replace('___', (challenge as FillInBlankChallenge).word);
      case ChallengeType.DIALOGUE:
        return (challenge as DialogueChallenge).speakerA;
      case ChallengeType.CONTEXT_MATCHING:
        return (challenge as ContextMatchingChallenge).exampleSentence;
      case ChallengeType.SYNONYM_ANTONYM:
        return (challenge as SynonymAntonymChallenge).exampleSentence;
      case ChallengeType.MULTIPLE_CHOICE:
      default:
        return (challenge as MultipleChoiceChallenge).exampleSentence;
    }
  }

  async handleAnswer(chatId: number, messageId: number, answerIndex: number, isCorrect: boolean): Promise<{ word: string; type: string; challengeType: string; isCorrect: boolean } | null> {
    const activeChallenge = await getActiveChallenge(chatId, messageId);

    if (!activeChallenge) {
      return null;
    }

    const { challenge } = activeChallenge;
    const selectedAnswer = challenge.options[answerIndex];

    const userPreference = await getUserPreference(chatId);
    const language = userPreference?.language ?? Language.SPANISH;
    const languageLabel = LANGUAGE_LABELS[language] || 'Language';

    const resultMessage = this.formatResultMessage(challenge, selectedAnswer, isCorrect, languageLabel);
    await this.bot.editMessageText(resultMessage, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });

    const explanationMessage = this.formatExplanationMessage(challenge, isCorrect);

    const challengeKey = `${chatId}_${messageId}`;
    const audioButton = {
      text: '🔊 Listen to pronunciation',
      callback_data: `${BOT_ACTIONS.AUDIO}${INLINE_KEYBOARD_SEPARATOR}${challengeKey}`,
    };

    await this.bot.sendMessage(chatId, explanationMessage, { parse_mode: 'Markdown', ...getInlineKeyboardMarkup([audioButton]) });

    // Extract word and type for analytics
    const word =
      challenge.challengeType === ChallengeType.MULTIPLE_CHOICE
        ? (challenge as MultipleChoiceChallenge).word
        : challenge.challengeType === ChallengeType.FILL_IN_BLANK
          ? (challenge as FillInBlankChallenge).word
          : challenge.challengeType === ChallengeType.CONTEXT_MATCHING
            ? (challenge as ContextMatchingChallenge).word
            : (challenge as SynonymAntonymChallenge).targetWord;

    const type = challenge.challengeType === ChallengeType.MULTIPLE_CHOICE ? (challenge as MultipleChoiceChallenge).type : challenge.challengeType;

    return { word, type, challengeType: challenge.challengeType, isCorrect };
  }

  async sendAudioPronunciation(chatId: number, challengeKey: string): Promise<void> {
    // Parse challengeKey to get chatId and messageId
    const [, messageIdStr] = challengeKey.split('_');
    const messageId = parseInt(messageIdStr);

    const activeChallenge = await getActiveChallenge(chatId, messageId);

    if (!activeChallenge) {
      return;
    }

    const { challenge } = activeChallenge;

    try {
      const audioPath = `${LOCAL_FILES_PATH}/langly_audio_${Date.now()}.mp3`;
      const audioText = this.getAudioText(challenge);
      const audioResponse = await getAudioFromText(audioText);

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      await fs.writeFile(audioPath, audioBuffer);

      await this.bot.sendVoice(chatId, audioPath, { caption: `🔊 "${audioText}"` });

      await deleteFile(audioPath);
    } catch (err) {
      this.logger.error(`Failed to generate audio ${err}`);
      await this.bot.sendMessage(chatId, '❌ Failed to generate audio. Please try again.');
    }
  }
}
