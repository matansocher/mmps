import type { Bot, Context } from 'grammy';
import { isProd, LOCAL_FILES_PATH, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile } from '@services/telegram';
import { SecretarySchedulerService } from './secretary-scheduler.service';
import { CHECK_IN_MESSAGE, CHECK_IN_SEND_CALLBACK, OWNER_BUSINESS_CONNECTION_ID, TOODIE_USER_ID, TRANSCRIPTION_HEADER } from './secretary.config';
import { SecretaryService } from './secretary.service';

const isOwner = (ctx: Context): boolean => ctx.from?.id === MY_USER_ID;

export class SecretaryController {
  private readonly logger = new Logger(SecretaryController.name);

  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly scheduler: SecretarySchedulerService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command('summary', (ctx) => this.summaryHandler(ctx));
    this.bot.on('business_connection', (ctx) => this.businessConnectionHandler(ctx));
    this.bot.on('business_message', (ctx) => this.businessMessageHandler(ctx));
    this.bot.callbackQuery(CHECK_IN_SEND_CALLBACK, (ctx) => this.checkInSendHandler(ctx));

    // Local-only: DM the bot directly to fake an incoming business message and test
    // persistence, transcription and the daily summary without a live Business connection.
    if (!isProd) {
      this.bot.command('ask', (ctx) => this.askHandler(ctx));
      this.bot.on(['message:voice', 'message:audio'], (ctx) => this.simulateAudioHandler(ctx));
      this.bot.on('message:text', (ctx) => this.simulateTextHandler(ctx));
      this.logger.log('Local simulation enabled: DM the bot (text/voice) to simulate incoming messages.');
    }
  }

  private async askHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) return;
    await this.scheduler.sendCheckInPrompt();
  }

  private businessConnectionHandler(ctx: Context): void {
    const connection = ctx.businessConnection;
    if (!connection) return;
    this.logger.log(`Business connection: id=${connection.id} enabled=${connection.is_enabled} userChatId=${connection.user_chat_id}`);
  }

  private async checkInSendHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (!OWNER_BUSINESS_CONNECTION_ID || !TOODIE_USER_ID) {
      await ctx.answerCallbackQuery({ text: 'Missing business connection id or target user id.', show_alert: true });
      return;
    }

    try {
      await this.bot.api.sendMessage(TOODIE_USER_ID, CHECK_IN_MESSAGE, { business_connection_id: OWNER_BUSINESS_CONNECTION_ID });
      await ctx.editMessageText(`Sent ✅\n\n"${CHECK_IN_MESSAGE}"`);
      await ctx.answerCallbackQuery({ text: 'Sent ✅' });
    } catch (err) {
      this.logger.error(`Failed to send check-in message: ${err}`);
      await ctx.answerCallbackQuery({ text: 'Failed to send.', show_alert: true });
    }
  }

  private async summaryHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) return;
    await ctx.reply("Building today's summaries… 🗒️");
    await this.scheduler.sendDailySummaries();
  }

  private async businessMessageHandler(ctx: Context): Promise<void> {
    const message = ctx.businessMessage;
    if (!message) return;

    const chatId = message.chat.id;
    const fromOwner = ctx.from?.id === MY_USER_ID;
    const senderName = ctx.from?.first_name ?? undefined;
    const senderUsername = ctx.from?.username ?? undefined;
    const businessConnectionId = message.business_connection_id;
    this.logger.log(`business_message | chatId=${chatId} | fromOwner=${fromOwner} | OWNER_BUSINESS_CONNECTION_ID=${businessConnectionId}`);

    const voiceFileId = message.voice?.file_id ?? message.audio?.file_id;

    // Transcribe voice notes the OTHER person sends, echo the transcription into the chat as the owner.
    if (voiceFileId && !fromOwner) {
      const transcript = await this.transcribe(voiceFileId);
      if (transcript) {
        await this.bot.api.sendMessage(chatId, `${TRANSCRIPTION_HEADER}\n${transcript}`, businessConnectionId ? { business_connection_id: businessConnectionId } : undefined);
        await this.secretaryService.storeMessage({ chatId, fromOwner: false, text: transcript, transcribed: true, senderName, senderUsername });
      }
      return;
    }

    const text = message.text ?? message.caption;
    if (!text) return;

    await this.secretaryService.storeMessage({ chatId, fromOwner, text, senderName, senderUsername });
  }

  private async transcribe(fileId: string): Promise<string> {
    try {
      const audioFilePath = await downloadFile(this.bot, fileId, LOCAL_FILES_PATH);
      return await getTranscriptFromAudio(audioFilePath);
    } catch (err) {
      this.logger.error(`Failed to transcribe audio: ${err}`);
      return '';
    }
  }

  private async simulateAudioHandler(ctx: Context): Promise<void> {
    const fileId = ctx.message?.voice?.file_id ?? ctx.message?.audio?.file_id;
    const chatId = ctx.chat?.id ?? 0;
    const senderName = ctx.from?.first_name ?? undefined;
    const senderUsername = ctx.from?.username ?? undefined;
    if (!fileId) return;

    const transcript = await this.transcribe(fileId);
    if (!transcript) return;
    await ctx.reply(`${TRANSCRIPTION_HEADER}\n${transcript}`);
    await this.secretaryService.storeMessage({ chatId, fromOwner: false, text: transcript, transcribed: true, senderName, senderUsername });
  }

  private async simulateTextHandler(ctx: Context): Promise<void> {
    const text = ctx.message?.text;
    const chatId = ctx.chat?.id ?? 0;
    if (!text || text.startsWith('/')) return;

    // Local testing convention: prefix with "me:" to simulate the owner's own message.
    const fromOwner = text.startsWith('me:');
    const body = fromOwner ? text.slice(3).trim() : text;
    if (!body) return;

    await this.secretaryService.storeMessage({ chatId, fromOwner, text: body, senderName: ctx.from?.first_name ?? undefined, senderUsername: ctx.from?.username ?? undefined });
    await ctx.reply(`📝 stored (${fromOwner ? 'owner' : 'other'}).`);
  }
}
