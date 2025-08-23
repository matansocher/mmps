import { RunnableConfig } from '@langchain/core/runnables';
import { CompiledStateGraph } from '@langchain/langgraph';
import { CHATBOT_CONFIG } from '../chatbot.config';
import { AiServiceOptions, InvokeOptions } from '../types';
import { createMessage } from './utils';

export class AiService {
  readonly name: string;
  readonly recursionLimit: number;

  constructor(
    readonly agent: CompiledStateGraph<any, any>,
    options: AiServiceOptions,
  ) {
    this.name = options.name;
    this.recursionLimit = options.recursionLimit ?? 100;
  }

  private createOptions(opts: Partial<InvokeOptions> = {}): RunnableConfig {
    const config: RunnableConfig = {
      recursionLimit: opts.recursionLimit ?? this.recursionLimit,
    };

    if (opts.threadId) {
      config.configurable = { thread_id: opts.threadId };
    }

    if (opts.callbacks) {
      config.callbacks = opts.callbacks;
    }

    return config;
  }

  private async truncateThreadIfNeeded(threadId?: string): Promise<void> {
    if (!threadId) return;

    try {
      const state = await this.agent.getState({ configurable: { thread_id: threadId } });

      if (!state?.values?.messages || !Array.isArray(state.values.messages)) {
        return;
      }

      const messages = state.values.messages;
      const maxMessages = CHATBOT_CONFIG.maxThreadMessages;

      if (messages.length <= maxMessages) {
        return;
      }

      // Separate system messages and regular messages
      const systemMessages = messages.filter((msg) => msg._getType() === 'system');
      const nonSystemMessages = messages.filter((msg) => msg._getType() !== 'system');

      const messagesToKeep = [];

      // Always preserve system messages if configured
      if (CHATBOT_CONFIG.preserveSystemMessages) {
        messagesToKeep.push(...systemMessages);
      }

      // Calculate how many non-system messages we can keep
      const availableSlots = maxMessages - messagesToKeep.length;

      if (availableSlots > 0) {
        // Keep the most recent non-system messages
        const recentMessages = nonSystemMessages.slice(-availableSlots);

        // If configured to preserve first message and we have room, include it
        if (CHATBOT_CONFIG.preserveFirstMessage && nonSystemMessages.length > 0 && availableSlots > 1) {
          const firstMessage = nonSystemMessages[0];
          const recentWithoutFirst = recentMessages.filter((msg) => msg !== firstMessage);

          if (recentWithoutFirst.length < availableSlots - 1) {
            messagesToKeep.push(firstMessage);
            messagesToKeep.push(...recentWithoutFirst);
          } else {
            messagesToKeep.push(firstMessage);
            messagesToKeep.push(...recentWithoutFirst.slice(-(availableSlots - 1)));
          }
        } else {
          messagesToKeep.push(...recentMessages);
        }
      }

      // Sort messages by their original order (assuming they have timestamps or indices)
      messagesToKeep.sort((a, b) => {
        const aIndex = messages.indexOf(a);
        const bIndex = messages.indexOf(b);
        return aIndex - bIndex;
      });

      // Update the thread state with truncated messages
      await this.agent.updateState({ configurable: { thread_id: threadId } }, { messages: messagesToKeep });

      console.log(`[AiService] Thread ${threadId} truncated from ${messages.length} to ${messagesToKeep.length} messages`);
    } catch (error) {
      console.error(`[AiService] Error truncating thread ${threadId}:`, error);
      // Don't throw - continue with the original request even if truncation fails
    }
  }

  async invoke(message: string, opts: Partial<InvokeOptions> = {}) {
    return this.agent.invoke(createMessage(message, opts), this.createOptions(opts));
  }

  stream(message: string, opts: Partial<InvokeOptions> = {}) {
    return this.agent.stream(createMessage(message, opts), this.createOptions(opts));
  }

  async getState(opts: Partial<InvokeOptions> = {}) {
    return this.agent.getState(this.createOptions(opts));
  }
}
