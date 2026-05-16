import type { Bot } from 'grammy';
import { ObjectId } from 'mongodb';
import { getDateString, Logger } from '@core/utils';
import { buildInlineKeyboard } from '@services/telegram';
import {
  abandonActiveSessions,
  createSession,
  DAILY_HEARTS,
  getActiveSession,
  getQuestionById,
  getStackerUser,
  Level,
  logAnswer,
  Question,
  QUESTION_TYPES,
  sampleQuestions,
  Session,
  SESSION_SIZE,
  StackerUser,
  Topic,
  updateSession,
  updateStackerUser,
  upsertStackerUser,
} from '@shared/stacker';
import { BOT_ACTIONS, INLINE_KEYBOARD_SEPARATOR, LEVEL_LABELS, TOPIC_LABELS } from './stacker.config';

type ButtonQuestion = Extract<Question, { type: 'multiple_choice' | 'code_output' }>;
type FillInQuestion = Extract<Question, { type: 'fill_in' }>;

const XP_PER_CORRECT = 20;

export class StackerService {
  private readonly logger = new Logger(StackerService.name);

  constructor(private readonly bot: Bot) {}

  async beginSession(chatId: number, telegramUserId: number, username: string | undefined, topic: Topic, level: Level): Promise<void> {
    await abandonActiveSessions(chatId);

    const user = await this.ensureUserAndHearts(chatId, telegramUserId, username);
    if (user.heartsRemaining <= 0) {
      await this.bot.api.sendMessage(chatId, '💔 You’re out of hearts.\n\nCome back tomorrow — your hearts refill on a new day.');
      return;
    }

    const questions = await sampleQuestions(topic, level, SESSION_SIZE);
    if (questions.length === 0) {
      await this.bot.api.sendMessage(chatId, `😕 No questions yet for ${TOPIC_LABELS[topic]} · ${LEVEL_LABELS[level]}.\n\nTry another combo, or check back soon — content is being added.`);
      return;
    }

    const queue = questions.map((q) => q._id!);
    const session = await createSession({
      chatId,
      topic,
      level,
      initialSize: queue.length,
      queue,
      retakeQueue: [],
      correctCount: 0,
      wrongCount: 0,
      status: 'active',
      startedAt: new Date(),
    });

    await this.bot.api.sendMessage(
      chatId,
      [`🎯 *${TOPIC_LABELS[topic]} · ${LEVEL_LABELS[level]}*`, `Round of ${queue.length} questions · ❤️ ${user.heartsRemaining} hearts`, '', 'Wrong answers cycle back until you nail them.'].join('\n'),
      { parse_mode: 'Markdown' },
    );

    await this.sendNextQuestion(chatId, session);
  }

  async sendStreakReminder(user: StackerUser): Promise<void> {
    const todayStr = getDateString();
    const lastStr = user.lastPlayedAt ? getDateString(user.lastPlayedAt) : null;
    if (lastStr === todayStr) return; // already played today, no nudge

    const dayDiff = lastStr ? Math.round((Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastStr}T00:00:00Z`)) / 86_400_000) : Infinity;
    const streakIntact = dayDiff === 1 && user.streakCount > 0;

    const message = streakIntact
      ? [`🔥 Your streak is *${user.streakCount} day${user.streakCount === 1 ? '' : 's'}* — don’t break it!`, '', 'One quick round to keep it alive?'].join('\n')
      : user.streakCount > 0
        ? [`💔 Your *${user.streakCount}-day* streak ended.`, '', 'Start a fresh one with a quick round?'].join('\n')
        : ['👋 Ready for a round of programming questions?', '', 'Build a streak by playing daily.'].join('\n');

    const keyboard = buildInlineKeyboard([{ text: '🎯 Play now', data: BOT_ACTIONS.PLAY, style: 'success' }]);
    await this.bot.api.sendMessage(user.chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  }

  async stopSession(chatId: number): Promise<boolean> {
    const session = await getActiveSession(chatId);
    if (!session) return false;
    await abandonActiveSessions(chatId);
    await this.bot.api.sendMessage(chatId, '✋ Round ended. Use /play to start a new one.');
    return true;
  }

  async gradeButtonAnswer(chatId: number, messageId: number, answerIndex: number): Promise<void> {
    const session = await getActiveSession(chatId);
    if (!session || !session.currentQuestionId || session.currentMessageId !== messageId) {
      return;
    }

    const question = await getQuestionById(session.currentQuestionId);
    if (!question || (question.type !== QUESTION_TYPES.MULTIPLE_CHOICE && question.type !== QUESTION_TYPES.CODE_OUTPUT)) {
      return;
    }

    const correct = answerIndex === question.correctOptionIndex;
    await this.bot.api.editMessageText(chatId, messageId, this.renderButtonResult(question, answerIndex), { parse_mode: 'Markdown' });

    await this.applyAnswer(chatId, session, question, correct);
  }

  async gradeTextAnswer(chatId: number, text: string, userMessageId: number): Promise<boolean> {
    const session = await getActiveSession(chatId);
    if (!session || !session.currentQuestionId) return false;

    const question = await getQuestionById(session.currentQuestionId);
    if (!question || question.type !== QUESTION_TYPES.FILL_IN) return false;

    const correct = isFillInCorrect(text, question.acceptedAnswers);
    await this.bot.api.setMessageReaction(chatId, userMessageId, [{ type: 'emoji', emoji: correct ? '👍' : '👎' }]).catch(() => {});

    await this.applyAnswer(chatId, session, question, correct);
    return true;
  }

  private async applyAnswer(chatId: number, session: Session, question: Question, correct: boolean): Promise<void> {
    await logAnswer(chatId, session._id!, question._id!, correct);

    if (!correct) {
      const lines = ['💭 *Not quite.*', '', `Correct answer: \`${primaryAnswer(question)}\``, '', '💡 *Explanation*', '', question.explanation];
      await this.bot.api.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
    }

    const retakeQueue = correct ? session.retakeQueue.slice() : [...session.retakeQueue, question._id!];
    const correctCount = correct ? session.correctCount + 1 : session.correctCount;
    const wrongCount = correct ? session.wrongCount : session.wrongCount + 1;

    await updateSession(session._id!, { retakeQueue, correctCount, wrongCount });

    if (!correct) {
      const heartsLeft = await this.decrementHeart(chatId);
      if (heartsLeft <= 0) {
        await this.terminateOutOfHearts(chatId, session._id!, { ...session, correctCount, wrongCount });
        return;
      }
    }

    const nextSession: Session = { ...session, retakeQueue, correctCount, wrongCount };
    await this.sendNextQuestion(chatId, nextSession);
  }

  private async sendNextQuestion(chatId: number, session: Session): Promise<void> {
    const queue = session.queue.slice();
    const retakeQueue = session.retakeQueue.slice();

    let nextId: ObjectId | undefined;
    if (queue.length > 0) {
      nextId = queue.shift();
    } else if (retakeQueue.length > 0) {
      nextId = retakeQueue.shift();
    }

    if (!nextId) {
      await this.finalizeSession(chatId, session);
      return;
    }

    const question = await getQuestionById(nextId);
    if (!question) {
      this.logger.error(`Skipping missing question ${nextId.toHexString()}`);
      await updateSession(session._id!, { queue, retakeQueue });
      await this.sendNextQuestion(chatId, { ...session, queue, retakeQueue });
      return;
    }

    const answered = session.correctCount + session.wrongCount;
    const remaining = queue.length + retakeQueue.length + 1;
    const progress = `Q${answered + 1} · ${remaining} to go`;

    const sentMessageId =
      question.type === QUESTION_TYPES.FILL_IN ? await this.sendFillInQuestion(chatId, question, progress) : await this.sendButtonQuestion(chatId, question, progress);

    await updateSession(session._id!, {
      queue,
      retakeQueue,
      currentQuestionId: question._id,
      currentMessageId: sentMessageId,
    });
  }

  private async sendButtonQuestion(chatId: number, question: ButtonQuestion, progress: string): Promise<number> {
    const keyboard = buildInlineKeyboard(
      question.options.map((option, index) => ({
        text: option,
        data: [BOT_ACTIONS.ANSWER, index].join(INLINE_KEYBOARD_SEPARATOR),
      })),
    );
    const sent = await this.bot.api.sendMessage(chatId, this.renderQuestion(question, progress), {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    return sent.message_id;
  }

  private async sendFillInQuestion(chatId: number, question: FillInQuestion, progress: string): Promise<number> {
    const sent = await this.bot.api.sendMessage(chatId, `${this.renderQuestion(question, progress)}\n\n✍️ _Type your answer as a reply._`, { parse_mode: 'Markdown' });
    return sent.message_id;
  }

  private async finalizeSession(chatId: number, session: Session): Promise<void> {
    await updateSession(session._id!, { status: 'completed', endedAt: new Date() });

    const user = await getStackerUser(chatId);
    const xpEarned = session.correctCount * XP_PER_CORRECT;
    const { newStreak, isNewDay } = computeNewStreak(user?.streakCount ?? 0, user?.lastPlayedAt);
    const totalXp = (user?.xp ?? 0) + xpEarned;

    await updateStackerUser(chatId, {
      xp: totalXp,
      streakCount: newStreak,
      lastPlayedAt: new Date(),
    });

    const total = session.correctCount + session.wrongCount;
    const accuracy = total === 0 ? 0 : Math.round((session.correctCount / total) * 100);
    const heartsRemaining = user?.heartsRemaining ?? DAILY_HEARTS;

    const summary = [
      '🏁 *Round complete!*',
      '',
      `✅ Correct: ${session.correctCount}  (+${xpEarned} XP)`,
      `❌ Wrong: ${session.wrongCount}`,
      `🎯 Accuracy: ${accuracy}%`,
      '',
      `⭐ Total XP: ${totalXp}`,
      `🔥 Streak: ${newStreak} day${newStreak === 1 ? '' : 's'}${isNewDay ? ' (kept alive!)' : ''}`,
      `❤️ Hearts: ${heartsRemaining} / ${DAILY_HEARTS}`,
      '',
      'Use /play to start another round.',
    ].join('\n');

    await this.bot.api.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
  }

  private async terminateOutOfHearts(chatId: number, sessionId: ObjectId, session: Session): Promise<void> {
    await updateSession(sessionId, { status: 'abandoned', endedAt: new Date() });
    const answered = session.correctCount + session.wrongCount;
    const message = [
      '💔 *Out of hearts!*',
      '',
      `You answered ${answered} question${answered === 1 ? '' : 's'} before running out.`,
      'No XP awarded for this round — but your streak is safe (it only updates on a completed round).',
      '',
      'Hearts refill on a new day. Try again tomorrow.',
    ].join('\n');
    await this.bot.api.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async ensureUserAndHearts(chatId: number, telegramUserId: number, username: string | undefined): Promise<StackerUser> {
    const user = await upsertStackerUser(chatId, telegramUserId, username);
    const todayStr = getDateString();
    const lastResetStr = user.heartsResetAt ? getDateString(user.heartsResetAt) : null;
    if (lastResetStr !== todayStr) {
      await updateStackerUser(chatId, { heartsRemaining: DAILY_HEARTS, heartsResetAt: new Date() });
      return { ...user, heartsRemaining: DAILY_HEARTS, heartsResetAt: new Date() };
    }
    return user;
  }

  private async decrementHeart(chatId: number): Promise<number> {
    const user = await getStackerUser(chatId);
    const next = Math.max(0, (user?.heartsRemaining ?? DAILY_HEARTS) - 1);
    await updateStackerUser(chatId, { heartsRemaining: next });
    return next;
  }

  private renderQuestion(question: Question, progress: string): string {
    const lines: string[] = [`📝 *${progress}*`, '', question.question];
    if (question.type === QUESTION_TYPES.CODE_OUTPUT || (question.type === QUESTION_TYPES.FILL_IN && question.codeSnippet)) {
      lines.push('', '```', question.codeSnippet!, '```');
    }
    return lines.join('\n');
  }

  private renderButtonResult(question: ButtonQuestion, answerIndex: number): string {
    const correct = answerIndex === question.correctOptionIndex;
    const lines: string[] = ['📝 *Answered*', '', question.question];
    if (question.type === QUESTION_TYPES.CODE_OUTPUT) {
      lines.push('', '```', question.codeSnippet, '```');
    }
    lines.push('');
    question.options.forEach((option, index) => {
      const marker = index === question.correctOptionIndex ? '✅' : index === answerIndex ? '❌' : '▫️';
      lines.push(`${marker} ${option}`);
    });
    lines.push('', correct ? '🎉 Correct!' : '💭 Not quite.');
    return lines.join('\n');
  }
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .trim();
}

function isFillInCorrect(input: string, acceptedAnswers: readonly string[]): boolean {
  const normalized = normalizeAnswer(input);
  return acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalized);
}

function primaryAnswer(question: Question): string {
  if (question.type === QUESTION_TYPES.FILL_IN) return question.acceptedAnswers[0] ?? '';
  return question.options[question.correctOptionIndex];
}

function computeNewStreak(currentStreak: number, lastPlayedAt: Date | undefined): { newStreak: number; isNewDay: boolean } {
  if (!lastPlayedAt) return { newStreak: 1, isNewDay: true };
  const todayStr = getDateString();
  const lastStr = getDateString(lastPlayedAt);
  if (lastStr === todayStr) return { newStreak: currentStreak, isNewDay: false };
  const dayDiff = Math.round((Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastStr}T00:00:00Z`)) / 86_400_000);
  if (dayDiff === 1) return { newStreak: currentStreak + 1, isNewDay: true };
  return { newStreak: 1, isNewDay: true };
}
