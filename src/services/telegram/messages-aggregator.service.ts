import { Injectable } from '@nestjs/common';

const TIMEOUT_MS = 100;

@Injectable()
export class MessagesAggregatorService {
  private messagesCache: any = {};

  handleIncomingMessage(message) {
    const { id: chatId } = message.chat;
    if (!this.messagesCache[chatId]) {
      this.handleIncomingMessageNotInCache(chatId, message);
    } else {
      this.handleIncomingMessageInCache(chatId, message);
    }
  }

  handleIncomingMessageNotInCache(chatId, message) {
    const timeoutId = this.startOrResetTimeout(chatId);
    this.messagesCache[chatId] = { message, timeoutId };
  }

  handleIncomingMessageInCache(chatId, message) {
    const timeoutId = this.startOrResetTimeout(chatId);
    const combinedMessage = { ...this.messagesCache[chatId].message, ...message };
    this.messagesCache[chatId] = { message: combinedMessage, timeoutId };
  }

  startOrResetTimeout(chatId) {
    if (this.messagesCache[chatId] && this.messagesCache[chatId].timeoutId) {
      clearTimeout(this.messagesCache[chatId].timeoutId);
    }
    return setTimeout(() => {
      this.handleTimeoutEnd(chatId);
    }, TIMEOUT_MS);
  }

  handleTimeoutEnd(chatId) {
    const { message } = this.messagesCache[chatId];
    delete this.messagesCache[chatId];
    this.processMessageCallback(message);
  }
}
