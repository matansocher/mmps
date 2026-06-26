import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { CompiledStateGraph } from '@langchain/langgraph';
import { AiServiceOptions, InvokeOptions, MessageState } from '../types';

function createMessage(message: string, opts: Partial<InvokeOptions> = {}): MessageState {
  const messages: BaseMessage[] = [];
  if (opts.system) {
    messages.push(new SystemMessage(opts.system));
  }
  messages.push(new HumanMessage(message));
  return { messages };
}

export class AiService {
  readonly name: string;
  readonly recursionLimit: number;
  readonly defaultCallbacks?: any[];

  constructor(
    readonly agent: CompiledStateGraph<any, any>,
    options: AiServiceOptions,
  ) {
    this.name = options.name;
    this.recursionLimit = options.recursionLimit ?? 100;
    this.defaultCallbacks = options.callbacks;
  }

  private createOptions(opts: Partial<InvokeOptions> = {}): RunnableConfig {
    const config: RunnableConfig = {
      recursionLimit: opts.recursionLimit ?? this.recursionLimit,
    };

    if (opts.threadId) {
      config.configurable = { thread_id: opts.threadId };
    }

    // Merge default callbacks with runtime callbacks
    const callbacks = [...(this.defaultCallbacks || []), ...(opts.callbacks || [])];
    if (callbacks.length > 0) {
      config.callbacks = callbacks;
    }

    return config;
  }

  // Context bounding is now handled inside the agent graph by `summarizationMiddleware`
  // (item #4), which compresses old turns into a summary and persists via the checkpointer.
  async invoke(message: string, opts: Partial<InvokeOptions> = {}) {
    return this.agent.invoke(createMessage(message, opts), this.createOptions(opts));
  }

  stream(message: string, opts: Partial<InvokeOptions> = {}) {
    const config = this.createOptions(opts);
    return this.agent.stream(createMessage(message, opts), { ...config, streamMode: opts.streamMode ?? 'values' });
  }

  async getState(opts: Partial<InvokeOptions> = {}) {
    return this.agent.getState(this.createOptions(opts));
  }
}
