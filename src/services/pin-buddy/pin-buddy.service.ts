import { PinBuddyUtilsService } from '@services/pin-buddy/pin-buddy-utils.service';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { PinBuddyMongoAnalyticLogService, PinBuddyMongoPinService, PinBuddyMongoUserService } from '@core/mongo/pin-buddy/services';
import { ITelegramMessageData } from '@services/telegram/interface';
import { MessageLoaderService } from '@services/telegram/message-loader.service';
import { BOT_BROADCAST_ACTIONS, BOTS } from '@services/telegram/telegram.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';

@Injectable()
export class PinBuddyService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly messageLoaderService: MessageLoaderService,
    private readonly pinBuddyUtilsService: PinBuddyUtilsService,
    private readonly mongoUserService: PinBuddyMongoUserService,
    private readonly mongoAnalyticLogService: PinBuddyMongoAnalyticLogService,
    private readonly mongoPinService: PinBuddyMongoPinService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.PIN_BUDDY.name) private readonly bot: TelegramBot,
  ) {}

  async handleReplyToMessage({ chatId, messageId, replyToMessageId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      //   1. send a temporary message to tell the user some thing like = 'OK, I will save this image for you'
      await this.telegramGeneralService.sendChatAction(this.bot, chatId, BOT_BROADCAST_ACTIONS.TYPING);
      const temporaryMessage = await this.telegramGeneralService.sendMessage(this.bot, chatId, 'OK, I will save this message for you, just a sec...', this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      const temporaryMessageId = temporaryMessage.message_id;
      //   2. save the message with the message id in mongo
      await this.mongoPinService.addPin(chatId, messageId, text);
      await this.pinBuddyUtilsService.sleep(3000);
      //   3. after mongo finishes + after 3 seconds - update the temporary message to tell the user that - 'OK, I have saved the image for you'
      //     a. also update the options of the bot to contain new saved message - `${messageId} - ${text}`
      // await this.telegramGeneralService.editMessageText(this.bot, chatId, temporaryMessageId, `OK, I have saved this message for you - ${text}`, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      await this.telegramGeneralService.editMessageText(this.bot, chatId, temporaryMessageId, `OK, I have saved this message for you - ${text}`);
      //   4. after another 3 seconds - delete the reply message of the user and also the temporary message of the bot
      await this.pinBuddyUtilsService.sleep(3000);
      await this.telegramGeneralService.deleteMessage(this.bot, chatId, replyToMessageId);
      await this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageId);

      // $$$$$$$$$$$$$$$$$$$$ maybe update the users original starred message and add an emoji of a star?
      // const originalText = await get original message by chatId and messageId
      // await this.telegramGeneralService.editMessageText(this.bot, chatId, messageId, `${text} ⭐️`, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
    } catch (err) {
      this.logger.error(this.handleReplyToMessage.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleUnstarMessage({ chatId, messageId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const messageIdToUnstar = parseInt(text);
      const pin = await this.mongoPinService.getPin(chatId, messageIdToUnstar);
      if (!pin) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, 'Sorry, but I could not find the message you are looking for', this.pinBuddyUtilsService.getKeyboardOptions(chatId));
        return;
      }
      //  1. user will send a message to the bot with the message id
      //  2. send a temporary message to tell the user some thing like = 'OK, I will delete the message from your saved messages'
      const temporaryMessage = await this.telegramGeneralService.sendMessage(this.bot, chatId, 'OK, I will delete the message from your saved messages, just a sec...', this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      const temporaryMessageId = temporaryMessage.message_id;
      //  3. delete the message mongo
      await this.mongoPinService.archivePin(chatId, messageIdToUnstar);
      await this.pinBuddyUtilsService.sleep(3000);
      //  4. after mongo finishes + after 3 seconds - update the temporary message to tell the user that - 'OK, I have deleted the message for you'
      await this.telegramGeneralService.editMessageText(this.bot, chatId, temporaryMessageId, `'OK, I have deleted the message for you - ${text}`, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      //    a. also update the options of the bot to NOT contain new saved message
      //  5. after another 3 seconds - delete the message of the user with the message idand also the temporary message of the bot
      await this.pinBuddyUtilsService.sleep(3000);
      await this.telegramGeneralService.deleteMessage(this.bot, chatId, messageId);
      await this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageId);
    } catch (err) {
      this.logger.error(this.handleUnstarMessage.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleClickOnStarredMessage({ chatId, username, messageId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      // $$$$$$$$$$$$$$$$$$$ navigate to here, but maybe since it is a button in options, it might not be possible
      `https://t.me/${username}/${messageId}`;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, 'resText', this.pinBuddyUtilsService.getKeyboardOptions(chatId));
    } catch (err) {
      this.logger.error(this.handleUnstarMessage.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
