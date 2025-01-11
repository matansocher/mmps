import TelegramBot from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';

@Injectable()
export class TelegramGeneralService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async downloadAudioFromVideoOrAudio(bot: TelegramBot, { video, audio }, localFilePath: string): Promise<{ audioFileLocalPath: string, videoFileLocalPath: string }> {
    try {
      let audioFileLocalPath: string;
      let videoFileLocalPath: string;
      if (video && video.file_id) {
        videoFileLocalPath = await bot.downloadFile(video.file_id, localFilePath);
        audioFileLocalPath = await this.utilsService.extractAudioFromVideo(videoFileLocalPath);
      } else if (audio && audio.file_id) {
        audioFileLocalPath = await bot.downloadFile(audio.file_id, localFilePath);
      }
      return { audioFileLocalPath, videoFileLocalPath };
    } catch (err) {
      this.logger.error(this.downloadAudioFromVideoOrAudio.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async sendMessage(bot: TelegramBot, chatId: number, messageText: string, form = {}) {
    try {
      return await bot.sendMessage(chatId, messageText, form);
    } catch (err) {
      this.logger.error(this.sendMessage.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  getMarkupExample(): string {
    return `
      *bold \\*text*
      _italic \\*text_
      __underline__
      ~strikethrough~
      ||spoiler||
      *bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
      [inline URL](http://www.example.com/)
      [inline mention of a user](tg://user?id=123456789)
      ![👍](tg://emoji?id=5368324170671202286)
      \`inline fixed-width code\`
      \`\`\`
      pre-formatted fixed-width code block
      \`\`\`
      \`\`\`python
      pre-formatted fixed-width code block written in the Python programming language
      \`\`\`
    `;

    // >Block quotation started
    // >Block quotation continued
    // >Block quotation continued
    // >Block quotation continued
    // >The last line of the block quotation
    // **>The expandable block quotation started right after the previous block quotation
    // >It is separated from the previous block quotation by an empty bold entity
    // >Expandable block quotation continued
    // >Hidden by default part of the expandable block quotation started
    // >Expandable block quotation continued
    // >The last line of the expandable block quotation with the expandability mark||
  }

  botErrorHandler(botName: string, handlerName: string, error): void {
    const { code, message } = error;
    this.logger.info(`${botName} - ${handlerName}`, `code: ${code}, message: ${message}`);
  }
}
