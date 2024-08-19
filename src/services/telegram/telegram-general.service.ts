import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { get as _get, chunk as _chunk } from 'lodash';
import { Injectable } from '@nestjs/common';
import { BOT_BROADCAST_ACTIONS } from '@services/telegram/telegram.config';
import { ITelegramCallbackQueryData, ITelegramMessageData } from '@services/telegram/interface';
import { UtilsService } from '@core/utils/utils.service';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class TelegramGeneralService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  getMessageData(message: Message): ITelegramMessageData {
    return {
      chatId: _get(message, 'chat.id', null),
      messageId: _get(message, 'message_id', null),
      replyToMessageId: _get(message, 'reply_to_message.message_id', null),
      replyToMessageText: _get(message, 'reply_to_message.text', null),
      telegramUserId: _get(message, 'from.id', null),
      firstName: _get(message, 'from.first_name', null),
      lastName: _get(message, 'from.last_name', null),
      username: _get(message, 'from.username', null),
      text: _get(message, 'text', '') || _get(message, 'caption', ''),
      audio: _get(message, 'audio', null) || _get(message, 'voice', null),
      video: _get(message, 'video', null),
      photo: _get(message, 'photo', null) || _get(message, 'sticker', null),
      file: _get(message, 'document', null),
      date: _get(message, 'date', null),
    };
  }

  getCallbackQueryData(callbackQuery: CallbackQuery): ITelegramCallbackQueryData {
    return {
      callbackQueryId: _get(callbackQuery, 'id', null),
      chatId: _get(callbackQuery, 'from.id', null),
      date: _get(callbackQuery, 'message.date', null),
      firstName: _get(callbackQuery, 'from.first_name', null),
      lastName: _get(callbackQuery, 'from.last_name', null),
      text: _get(callbackQuery, 'message.text', null),
      data: _get(callbackQuery, 'data', null),
    };
  }

  getInlineKeyboardMarkup(inlineKeyboardButtons: any[], numberOfColumnsPerRow: number = 1): { reply_markup: string } {
    const inlineKeyboard = { inline_keyboard: [] };
    inlineKeyboardButtons.forEach((button) => inlineKeyboard.inline_keyboard.push(button));
    inlineKeyboard.inline_keyboard = _chunk(inlineKeyboard.inline_keyboard, numberOfColumnsPerRow);
    return { reply_markup: JSON.stringify(inlineKeyboard) };
  }

  async downloadFile(bot: TelegramBot, fileId: string, path: string): Promise<string> {
    try {
      return await bot.downloadFile(fileId, path);
    } catch (err) {
      this.logger.error(this.downloadFile.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async downloadAudioFromVideoOrAudio(bot: TelegramBot, { video, audio }, localFilePath: string): Promise<string> {
    try {
      let audioFileLocalPath;
      if (video && video.file_id) {
        const videoFileLocalPath = await this.downloadFile(bot, video.file_id, localFilePath);
        audioFileLocalPath = await this.utilsService.extractAudioFromVideo(videoFileLocalPath);
        this.utilsService.deleteFile(videoFileLocalPath);
      } else if (audio && audio.file_id) {
        audioFileLocalPath = await this.downloadFile(bot, audio.file_id, localFilePath);
      }
      return audioFileLocalPath;
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

  async editMessageText(bot: TelegramBot, chatId: number, messageId: number, messageText: string, form = {}) {
    try {
      return await bot.editMessageText(messageText, { chat_id: chatId, message_id: messageId, ...form });
    } catch (err) {
      this.logger.error(this.editMessageText.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async deleteMessage(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (err) {
      this.logger.error(this.deleteMessage.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  // async setMessageReaction(bot: TelegramBot, chatId: number, messageId: number, reaction: any): Promise<void> {
  //   try {
  //     await bot.setMessageReaction(chatId, messageId, reaction);
  //   } catch (err) {
  //     this.logger.error(this.setMessageReaction.name, `err: ${this.utilsService.getErrorMessage(err)}`);
  //   }
  // }

  async sendAudio(bot: TelegramBot, chatId: number, audioFilePath: string): Promise<void> {
    try {
      await bot.sendAudio(chatId, audioFilePath);
    } catch (err) {
      this.logger.error(this.sendAudio.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendVoice(bot: TelegramBot, chatId: number, audioFilePath: string, form = {}): Promise<void> {
    try {
      await bot.sendVoice(chatId, audioFilePath, form);
    } catch (err) {
      this.logger.error(this.sendVoice.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendVenue(bot: TelegramBot, chatId: number, latitude, longitude, title, address): Promise<void> {
    try {
      await bot.sendVenue(chatId, latitude, longitude, title, address);
    } catch (err) {
      this.logger.error(this.sendVenue.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendPhoto(bot: TelegramBot, chatId: number, imageUrl: string, form = {}): Promise<void> {
    try {
      await bot.sendPhoto(chatId, imageUrl, form);
    } catch (err) {
      this.logger.error(this.sendPhoto.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  sendChatAction(bot: TelegramBot, chatId: number, action = BOT_BROADCAST_ACTIONS.TYPING): void {
    try {
      bot.sendChatAction(chatId, action);
    } catch (err) {
      this.logger.error(this.sendChatAction.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  botErrorHandler(botName: string, handlerName: string, error): void {
    const { code, message } = error;
    this.logger.info(`${botName} bot - ${handlerName}`, `code: ${code}, message: ${message}`);
  }
}
