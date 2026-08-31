import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { CompiledStateGraph } from '@langchain/langgraph';
import { AiServiceOptions, InvokeOptions, MessageState } from '../types';

function createMessage(message: string, opts: Partial<InvokeOptions> = {}): MessageState {
  const messages: BaseMessage[] = [];
  if (opts.system) {
    messages.push(new SystemMessage(opts.system));
  }
  if (opts.images?.length) {
    messages.push(
      new HumanMessage({
        content: [{ type: 'text', text: message }, ...opts.images.map((url) => ({ type: 'image_url', image_url: { url } }))],
      }),
    );
  } else {
    messages.push(new HumanMessage({ id: opts.humanMessageId, content: message }));
  }
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
    return this.agent.stream(createMessage(message, opts), this.createOptions(opts));
  }

  async getState(opts: Partial<InvokeOptions> = {}) {
    return this.agent.getState(this.createOptions(opts));
  }

  // Swaps a previously-persisted human turn for a short marker in the durable thread, so a verbose
  // scheduler prompt does not consume the summarization budget or get baked into the Mongo summary.
  // The turn's result (the AI message) stays in the thread and remains replyable ("try again").
  // Re-using the same message id upserts in place, preserving chronological order.
  async replaceHumanMessage(humanMessageId: string, marker: string, opts: Partial<InvokeOptions> = {}): Promise<void> {
    const config = this.createOptions(opts);
    await this.agent.updateState(config, { messages: [new HumanMessage({ id: humanMessageId, content: marker })] });
  }
}
