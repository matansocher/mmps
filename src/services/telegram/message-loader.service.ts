import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { get as _get, chunk as _chunk } from 'lodash';
import { Injectable } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config/main.config';
import { BOT_BROADCAST_ACTIONS } from '@core/config/telegram.config';
import { UtilsService } from '@services/utils/utils.service';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class MessageLoaderService {
  private bot: any;
  private chatId: number;

  // constructor(
  //   private readonly logger: LoggerService,
  //   private readonly utilsService: UtilsService,
  //   private readonly telegramGeneralService: TelegramGeneralService,
  // ) {}
  //
  // waitForMessage() {
  //   try {
  //     generalBotService.setBotTyping(this.bot, this.chatId, this.options.loadingAction);
  //     this.cycleInitiator();
  //   } catch (err) {
  //     logger.error(this.waitForMessage.name, `error - ${utilsService.getErrorMessage(err)}`);
  //     this.stopLoader();
  //   }
  // }
  //
  // cycleInitiator() {
  //   this.timeoutId = setTimeout(async () => {
  //     if (this.isMessageProcessed || this.cycleIterationIndex > LOADER_MESSAGES.length) {
  //       return;
  //     }
  //     await this.handleProcessCycle()
  //   }, this.options.cycleDuration || DEFAULT_CYCLE_DURATION);
  // }
  //
  // async handleProcessCycle() {
  //   let messagePromise;
  //
  //   const messageText = this.cycleIterationIndex < LOADER_MESSAGES.length ? LOADER_MESSAGES[this.cycleIterationIndex] : LOADER_MESSAGES[LOADER_MESSAGES.length - 1];
  //   if (this.cycleIterationIndex === 0) {
  //     messagePromise = generalBotService.sendMessage(this.bot, this.chatId, messageText);
  //   } else {
  //     messagePromise = generalBotService.editMessageText(this.bot, this.chatId, this.loaderMessageId, messageText);
  //   }
  //   generalBotService.setBotTyping(this.bot, this.chatId, this.options.loadingAction);
  //
  //   const messageRes = await messagePromise;
  //   this.loaderMessageId = (messageRes && messageRes.message_id) ? messageRes.message_id : this.loaderMessageId;
  //   this.cycleIterationIndex = this.cycleIterationIndex + 1;
  //   this.cycleInitiator();
  // }
  //
  // stopLoader() {
  //   this.isMessageProcessed = true;
  //   clearTimeout(this.timeoutId);
  //   this.timeoutId = null;
  //   generalBotService.deleteMessage(this.bot, this.chatId, this.loaderMessageId);
  // }
}

// async function withMessageLoader(bot, chatId, options, action) {
//   const messageLoader = new MessageLoader(bot, chatId, options);
//
//   try {
//     messageLoader.waitForMessage();
//     await action();
//   } catch (err) {
//     this.logger.error(withMessageLoader.name, `error - ${this.utilsService.getErrorMessage(err)}`);
//     messageLoader.stopLoader();
//     throw err;
//   } finally {
//     messageLoader.stopLoader();
//   }
// }
