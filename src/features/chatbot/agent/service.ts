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

  private async truncateThread(threadId?: string): Promise<void> {
    if (!threadId) return;

    try {
      const state = await this.agent.getState({ configurable: { thread_id: threadId } });

      if (!state?.values?.messages || !Array.isArray(state.values.messages)) {
        return;
      }

      const messages = state.values.messages;
      if (messages.length <= CHATBOT_CONFIG.maxThreadMessages) {
        return;
      }

      const systemMessages = messages.filter((msg) => msg._getType() === 'system');
      const nonSystemMessages = messages.filter((msg) => msg._getType() !== 'system');

      const messagesToKeep = [];

      if (CHATBOT_CONFIG.preserveSystemMessages) {
        messagesToKeep.push(...systemMessages);
      }

      const availableSlots = CHATBOT_CONFIG.maxThreadMessages - messagesToKeep.length;

      if (availableSlots > 0) {
        const recentMessages = nonSystemMessages.slice(-availableSlots);

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

      messagesToKeep.sort((a, b) => messages.indexOf(a) - messages.indexOf(b));

      await this.agent.updateState({ configurable: { thread_id: threadId } }, { messages: messagesToKeep });

      console.log(`[AiService] Thread ${threadId} truncated from ${messages.length} to ${messagesToKeep.length} messages`);
    } catch (err) {
      console.error(`[AiService] Error truncating thread ${threadId}: ${err}`);
    }
  }

  async invoke(message: string, opts: Partial<InvokeOptions> = {}) {
    await this.truncateThread(opts.threadId);

    return this.agent.invoke(createMessage(message, opts), this.createOptions(opts));
  }

  stream(message: string, opts: Partial<InvokeOptions> = {}) {
    // truncation is async but we don't await it to avoid blocking the stream
    this.truncateThread(opts.threadId);

    return this.agent.stream(createMessage(message, opts), this.createOptions(opts));
  }

  async getState(opts: Partial<InvokeOptions> = {}) {
    return this.agent.getState(this.createOptions(opts));
  }
}
