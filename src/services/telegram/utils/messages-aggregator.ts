import type { Message } from 'node-telegram-bot-api';

const TIMEOUT_MS = 100;

interface MessageAggregatorData {
  readonly message: Message;
  readonly timeoutId: NodeJS.Timeout | number;
  readonly processMessageCallback: (message: Message) => void;
}

export class MessagesAggregator {
  private messagesCache: Record<number, MessageAggregatorData> = {};

  handleIncomingMessage(message: Message, processMessageCallback: (message: Message) => void): void {
    const { id: chatId } = message.chat;

    const timeoutId = this.startOrResetTimeout(chatId);
    let combinedMessage = message;
    if (this.messagesCache[chatId]) {
      // already has a pending message in cache
      combinedMessage = { ...this.messagesCache[chatId].message, ...message };
    }
    this.messagesCache[chatId] = { message: combinedMessage, timeoutId, processMessageCallback };
  }

  private startOrResetTimeout(chatId: number): NodeJS.Timeout | number {
    if (this.messagesCache[chatId]?.timeoutId) {
      clearTimeout(this.messagesCache[chatId].timeoutId);
    }
    return setTimeout(() => {
      this.handleTimeoutEnd(chatId);
    }, TIMEOUT_MS);
  }

  private handleTimeoutEnd(chatId: number): void {
    const { message } = this.messagesCache[chatId];
    this.messagesCache[chatId].processMessageCallback(message);
    delete this.messagesCache[chatId];
  }
}
