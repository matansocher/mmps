import { get as _get, chunk as _chunk } from 'lodash';
import { Injectable } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config/main.config';
import { BOT_BROADCAST_ACTIONS } from '@core/config/telegram.config';
import { UtilsService } from '@services/utils/utils.service';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class TelegramGeneralService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  getMessageData(message) {
    return {
      chatId: _get(message, 'chat.id', ''),
      telegramUserId: _get(message, 'from.id', ''),
      firstName: _get(message, 'from.first_name', ''),
      lastName: _get(message, 'from.last_name', ''),
      username: _get(message, 'from.username', ''),
      text: _get(message, 'text', '') || _get(message, 'caption', ''),
      audio: _get(message, 'audio', null) || _get(message, 'voice', null),
      video: _get(message, 'video', null),
      photo: _get(message, 'photo', null) || _get(message, 'sticker', null),
      date: _get(message, 'date', ''),
    };
  }

  getCallbackQueryData(callbackQuery) {
    return {
      callbackQueryId: _get(callbackQuery, 'id', ''),
      chatId: _get(callbackQuery, 'from.id', ''),
      date: _get(callbackQuery, 'message.date', ''),
      firstName: _get(callbackQuery, 'from.first_name', ''),
      lastName: _get(callbackQuery, 'from.last_name', ''),
      text: _get(callbackQuery, 'message.text', ''),
      data: _get(callbackQuery, 'data', ''),
    };
  }

  getInlineKeyboardMarkup(inlineKeyboardButtons, numberOfColumnsPerRow = 1) {
    const inlineKeyboard = { inline_keyboard: [] };
    inlineKeyboardButtons.forEach(button => inlineKeyboard.inline_keyboard.push(button));
    inlineKeyboard.inline_keyboard = _chunk(inlineKeyboard.inline_keyboard, numberOfColumnsPerRow);
    return { reply_markup: JSON.stringify(inlineKeyboard) };
  }

  async downloadFile(bot, fileId, path) {
    try {
      return await bot.downloadFile(fileId, path);
    } catch (err) {
      this.logger.error(this.downloadFile.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async downloadAudioFromVideoOrAudio(bot, { video, audio }) {
    try {
      let audioFileLocalPath;
      if (video && video.file_id) {
        const videoFileLocalPath = await this.downloadFile(bot, video.file_id, LOCAL_FILES_PATH);
        audioFileLocalPath = await this.utilsService.extractAudioFromVideo(videoFileLocalPath);
        this.utilsService.deleteFile(videoFileLocalPath);
      } else if (audio && audio.file_id) {
        audioFileLocalPath = await this.downloadFile(bot, audio.file_id, LOCAL_FILES_PATH);
      }
      return audioFileLocalPath;
    } catch (err) {
      this.logger.error(this.downloadAudioFromVideoOrAudio.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async sendMessage(bot, chatId, messageText, form = {}) {
    try {
      return await bot.sendMessage(chatId, messageText, form);
    } catch (err) {
      this.logger.error(this.sendMessage.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async editMessageText(bot, chatId, messageId, messageText) {
    try {
      return await bot.editMessageText(messageText, { chat_id: chatId, message_id: messageId });
    } catch (err) {
      this.logger.error(this.editMessageText.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async deleteMessage(bot, chatId, messageId) {
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (err) {
      this.logger.error(this.deleteMessage.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendAudio(bot, chatId, audioFilePath) {
    try {
      await bot.sendAudio(chatId, audioFilePath);
    } catch (err) {
      this.logger.error(this.sendAudio.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendVoice(bot, chatId, audioFilePath) {
    try {
      await bot.sendVoice(chatId, audioFilePath);
    } catch (err) {
      this.logger.error(this.sendVoice.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendVenue(bot, chatId, latitude, longitude, title, address) {
    try {
      await bot.sendVenue(chatId, latitude, longitude, title, address);
    } catch (err) {
      this.logger.error(this.sendVenue.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async sendPhoto(bot, chatId, imageUrl, form = {}) {
    try {
      await bot.sendPhoto(chatId, imageUrl, form);
    } catch (err) {
      this.logger.error(this.sendPhoto.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  setBotTyping(bot, chatId, action = BOT_BROADCAST_ACTIONS.TYPING) {
    try {
      bot.sendChatAction(chatId, action);
    } catch (err) {
      this.logger.error(this.setBotTyping.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  botErrorHandler(botName, handlerName, error) {
    const { code, message } = error;
    this.logger.info(`${botName} bot - ${handlerName}`, `code: ${code}, message: ${message}`);
  }

  decodeCallbackData(data) {
    return this.utilsService.queryParamsToObject(data);
  }

  encodeCallbackData(data) {
    return this.utilsService.objectToQueryParams(data);
  }
}
