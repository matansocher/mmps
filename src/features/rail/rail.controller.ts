import { type Bot, type Context, InputFile } from 'grammy';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LOCAL_FILES_PATH } from '@core/config';
import { createRateLimitCounter } from '@core/express';
import { deleteFile, getErrorMessage, Logger } from '@core/utils';
import { buildToolImages, RAIL_ROUTE_IMAGE_BUILDER } from '@features/chatbot/tool-images';
import { notify } from '@services/notifier';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile, getCallbackQueryData, getMessageData, MessageLoader, sendRichMessageWithPhotos, type UserDetails } from '@services/telegram';
import { detectLanguage, type ImageLanguage } from '@shared/image-card';
import { getAvatarHash, saveAvatarHash, saveUserDetails } from './mongo';
import { BOT_CONFIG, BOT_PROFILE, MESSAGES, RAIL_LIMITS, START_MESSAGE } from './rail.config';
import { RailService } from './rail.service';
import { buildRouteKeyboard, formatRouteMessage, getRouteContext, getUserLanguage, parseCallbackData } from './rail.utils';

const GLOBAL_KEY = 'all';
const AVATAR_PATH = resolve(process.cwd(), 'assets/images/rail/avatar.png');

function notifyConversation(action: string, question: string, answer: string, userDetails: UserDetails): void {
  notify(BOT_CONFIG, { action, plainText: `❓ ${question}\n\n💬 ${answer}` }, userDetails);
}

export class RailController {
  private readonly logger = new Logger(RailController.name);
  private readonly hitUserLimit = createRateLimitCounter({ windowMs: RAIL_LIMITS.userWindowMs, prefix: 'rail-bot:user' });
  private readonly hitGlobalLimit = createRateLimitCounter({ windowMs: RAIL_LIMITS.globalWindowMs, prefix: 'rail-bot:global' });

  constructor(
    private readonly railService: RailService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command(BOT_CONFIG.commands.START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on(['message:voice', 'message:audio'], (ctx) => this.audioHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.syncBotProfile().catch((err) => this.logger.error(`Failed to set bot profile: ${getErrorMessage(err)}`));
    this.syncBotAvatar().catch((err) => this.logger.error(`Failed to set bot avatar: ${getErrorMessage(err)}`));
  }

  // English is the default for every Telegram language except Hebrew, matching getUserLanguage.
  private async syncBotProfile(): Promise<void> {
    const { en, he } = BOT_PROFILE;
    await Promise.all([
      this.bot.api.setMyDescription(en.description),
      this.bot.api.setMyShortDescription(en.shortDescription),
      this.bot.api.setMyDescription(he.description, { language_code: 'he' }),
      this.bot.api.setMyShortDescription(he.shortDescription, { language_code: 'he' }),
    ]);
  }

  // Every upload adds a new photo to the bot's profile history, so only upload when the file changed.
  private async syncBotAvatar(): Promise<void> {
    const avatar = await readFile(AVATAR_PATH);
    const hash = createHash('sha256').update(avatar).digest('hex');
    if ((await getAvatarHash()) === hash) return;
    await this.bot.api.setMyProfilePhoto({ type: 'static', photo: new InputFile(avatar, 'avatar.png') });
    await saveAvatarHash(hash);
    this.logger.log('Bot avatar updated');
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    const saveResult = await saveUserDetails(userDetails);
    await ctx.reply(START_MESSAGE, { reply_markup: { remove_keyboard: true } });
    notify(BOT_CONFIG, { action: 'START', isNewUser: saveResult === 'created' }, userDetails);
  }

  // Counts every expensive request (text, voice, buttons) against a per-user and a bot-wide window.
  private async isRateLimited(ctx: Context, language: ImageLanguage): Promise<boolean> {
    const userId = ctx.from?.id ?? ctx.chat?.id;
    const [userHits, globalHits] = await Promise.all([this.hitUserLimit(String(userId)), this.hitGlobalLimit(GLOBAL_KEY)]);
    if (userHits > RAIL_LIMITS.userMaxRequests) {
      // Only answer on the first blocked hit so a spammer doesn't make us spam back.
      if (userHits === RAIL_LIMITS.userMaxRequests + 1) await ctx.reply(MESSAGES.userRateLimited[language]).catch(() => {});
      return true;
    }
    if (globalHits > RAIL_LIMITS.globalMaxRequests) {
      this.logger.warn(`Global rate limit reached (${globalHits})`);
      await ctx.reply(MESSAGES.globalRateLimited[language]).catch(() => {});
      return true;
    }
    return false;
  }

  private async textHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text, userDetails } = getMessageData(ctx);
    const language = detectLanguage(text);
    if (await this.isRateLimited(ctx, language)) return;

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      const answer = await this.answerQuery(chatId, text, language);
      notifyConversation('MESSAGE', text, answer, userDetails);
    });
  }

  private async audioHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, audio, userDetails } = getMessageData(ctx);
    const fallbackLanguage = getUserLanguage(ctx.from?.language_code);
    if (await this.isRateLimited(ctx, fallbackLanguage)) return;
    if (audio?.duration > RAIL_LIMITS.maxVoiceSeconds) {
      await ctx.reply(MESSAGES.voiceTooLong[fallbackLanguage]);
      return;
    }

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      let audioFilePath: string | null = null;
      let transcript = '';
      try {
        audioFilePath = await downloadFile(this.bot, audio.file_id, LOCAL_FILES_PATH);
        transcript = (await getTranscriptFromAudio(audioFilePath)).trim();
      } catch (err) {
        this.logger.error(`Voice transcription failed: ${getErrorMessage(err)}`);
      } finally {
        if (audioFilePath) deleteFile(audioFilePath);
      }

      if (!transcript) {
        await ctx.reply(MESSAGES.voiceNotUnderstood[fallbackLanguage]);
        notifyConversation('VOICE_MESSAGE', '(voice not understood)', MESSAGES.voiceNotUnderstood[fallbackLanguage], userDetails);
        return;
      }
      const answer = await this.answerQuery(chatId, transcript, detectLanguage(transcript));
      notifyConversation('VOICE_MESSAGE', transcript, answer, userDetails);
    });
  }

  private async answerQuery(chatId: number, text: string, language: ImageLanguage): Promise<string> {
    const { message, toolResults } = await this.railService.processMessage(text, chatId, language);

    const images = await buildToolImages(toolResults, message, [RAIL_ROUTE_IMAGE_BUILDER]);
    const context = getRouteContext(toolResults);
    const replyMarkup = context ? buildRouteKeyboard(context, detectLanguage(message)) : undefined;
    await sendRichMessageWithPhotos(this.bot, chatId, message, images, replyMarkup ? { reply_markup: replyMarkup } : {});
    return message;
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, data, userDetails } = getCallbackQueryData(ctx);
    await ctx.answerCallbackQuery().catch(() => {});

    const request = data ? parseCallbackData(data) : null;
    if (!chatId || !request) return;
    if (await this.isRateLimited(ctx, request.language)) return;

    const action = request.action === 'later' ? 'LATER_TRAINS' : 'REVERSE_DIRECTION';
    const { fromStationId, toStationId, date, time, language } = request;
    const question = `[button] ${fromStationId} → ${toStationId} at ${date} ${time}`;
    try {
      const result = await this.railService.searchRoute(fromStationId, toStationId, date, time, language);
      if (!result || !result.context.trains.length) {
        await ctx.reply(MESSAGES.noTrains[language]);
        notifyConversation(action, question, MESSAGES.noTrains[language], userDetails);
        return;
      }
      const answer = formatRouteMessage(result.context, result.railWebsiteUrl, language);
      const photos = result.image ? [{ image: result.image, fileName: 'rail-route.png' }] : [];
      await sendRichMessageWithPhotos(this.bot, chatId, answer, photos, { reply_markup: buildRouteKeyboard(result.context, language) });
      notifyConversation(action, `[button] ${result.context.from.nameEn} → ${result.context.to.nameEn} at ${date} ${time}`, answer, userDetails);
    } catch (err) {
      this.logger.error(`callbackQueryHandler failed: ${getErrorMessage(err)}`);
      await ctx.reply(MESSAGES.error[language]);
      notifyConversation(action, question, `${MESSAGES.error[language]} (${getErrorMessage(err)})`, userDetails);
    }
  }
}
