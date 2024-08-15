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
      await this.telegramGeneralService.sendChatAction(this.bot, chatId, BOT_BROADCAST_ACTIONS.TYPING);

      const existingPin = await this.mongoPinService.getPin(chatId, replyToMessageId);
      if (existingPin) {
        const { message_id: temporaryMessageAfterCheckId } = await this.telegramGeneralService.sendMessage(this.bot, chatId, 'Sorry, but this message is already pinned', await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
        await this.pinBuddyUtilsService.sleep(3000);
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageAfterCheckId);
        return;
      }

      const { message_id: temporaryMessageBeforeSaveId } = await this.telegramGeneralService.sendMessage(this.bot, chatId, 'OK, I will save this message for you, just a sec...', await this.pinBuddyUtilsService.getKeyboardOptions(chatId));

      await this.mongoPinService.addPin(chatId, replyToMessageId, text);
      await this.pinBuddyUtilsService.sleep(3000);

      const { message_id: temporaryMessageAfterSaveId } = await this.telegramGeneralService.sendMessage(this.bot, chatId, `OK, I have saved this message for you - ${text}`, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));

      await this.pinBuddyUtilsService.sleep(2000);
      await Promise.all([
        this.telegramGeneralService.deleteMessage(this.bot, chatId, messageId),
        this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageBeforeSaveId),
        this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageAfterSaveId),
      ]);

      // $$$$$$$$$$$$$$$$$$$$ add a reaction to it - setMessageReaction
      // $$$$$$$$$$$$$$$$$$$$ and maybe to delete a star - just delete the reaction
    } catch (err) {
      this.logger.error(this.handleReplyToMessage.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleUnstarMessage({ chatId, messageId, text }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      const messageIdToUnstar = parseInt(text);
      const existingPin = await this.mongoPinService.getPin(chatId, messageIdToUnstar);
      if (!existingPin) {
        const { message_id: temporaryMessageAfterCheckId } = await this.telegramGeneralService.sendMessage(this.bot, chatId, 'Sorry, but I could not find the message you are looking for', await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
        await this.pinBuddyUtilsService.sleep(3000);
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageAfterCheckId);
        return;
      }
      //  1. user will send a message to the bot with the message id
      //  2. send a temporary message to tell the user some thing like = 'OK, I will delete the message from your saved messages'
      const { message_id: temporaryMessageBeforeSaveId } = await this.telegramGeneralService.sendMessage(this.bot, chatId, 'OK, I will unpin the message from your saved messages, just a sec...', await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      //  3. delete the message mongo
      await this.mongoPinService.archivePin(chatId, messageIdToUnstar);
      await this.pinBuddyUtilsService.sleep(3000);
      //  4. after mongo finishes + after 3 seconds - update the temporary message to tell the user that - 'OK, I have deleted the message for you'
      const { message_id: temporaryMessageAfterSaveId } = await this.telegramGeneralService.sendMessage(this.bot, chatId, `OK, I unpinned the message for you - ${text}`, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      //    a. also update the options of the bot to NOT contain new saved message
      //  5. after another 3 seconds - delete the message of the user with the message idand also the temporary message of the bot
      await this.pinBuddyUtilsService.sleep(3000);
      await Promise.all([
        this.telegramGeneralService.deleteMessage(this.bot, chatId, messageId),
        this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageBeforeSaveId),
        this.telegramGeneralService.deleteMessage(this.bot, chatId, temporaryMessageAfterSaveId),
      ]);
      // $$$$$$$$$$$$$$$$$ remove the start reaction for the original message
    } catch (err) {
      this.logger.error(this.handleUnstarMessage.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleClickOnStarredMessage({ chatId, messageId }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      // $$$$$$$$$$$$$$$$$$$ navigate to here, but maybe since it is a button in options, it might not be possible
      const link = `https://t.me/c/${chatId}/${messageId}`;
      // const link = `https://t.me/${username}/${messageId}`;
      // await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      await this.bot.sendMessage(chatId, `Click [here](${link}) to jump to the original message.`, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      this.logger.error(this.handleUnstarMessage.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
