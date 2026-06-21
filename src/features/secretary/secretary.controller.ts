import type { Bot, Context } from 'grammy';
import { isProd, LOCAL_FILES_PATH, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile } from '@services/telegram';
import { SecretarySchedulerService } from './secretary-scheduler.service';
import { TRANSCRIPTION_HEADER } from './secretary.config';
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
    this.bot.on('business_message', (ctx) => this.businessMessageHandler(ctx));

    // Local-only: DM the bot directly to fake an incoming business message and test
    // persistence, transcription and the daily summary without a live Business connection.
    if (!isProd) {
      this.bot.on(['message:voice', 'message:audio'], (ctx) => this.simulateAudioHandler(ctx));
      this.bot.on('message:text', (ctx) => this.simulateTextHandler(ctx));
      this.logger.log('Local simulation enabled: DM the bot (text/voice) to simulate incoming messages.');
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
