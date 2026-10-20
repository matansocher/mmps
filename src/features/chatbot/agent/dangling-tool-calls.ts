import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';
import { Logger } from '@core/utils';

const logger = new Logger('chatbot:dangling-tool-calls');

export const DANGLING_TOOL_CALL_CONTENT = 'This tool call was not executed and has no result. Call the tool again if you still need it.';

// OpenAI rejects a request when an assistant message with tool_calls is not followed by a tool message
// for every tool_call_id. That state gets checkpointed when a turn dies between the model and tool
// steps (deploy restart, turn timeout) or when langchain retries a failed structured output and only
// answers the first of several parallel calls - and then every later turn on the thread fails.
// Each missing result is patched in, right after its assistant message, only in the request sent to the model.
export function repairDanglingToolCalls(messages: BaseMessage[]): { readonly messages: BaseMessage[]; readonly repaired: number } {
  const answeredIds = new Set(messages.filter(ToolMessage.isInstance).map((message) => message.tool_call_id));
  const result: BaseMessage[] = [];
  let repaired = 0;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    result.push(message);
    if (!AIMessage.isInstance(message) || !message.tool_calls?.length) {
      continue;
    }

    while (i + 1 < messages.length && ToolMessage.isInstance(messages[i + 1])) {
      result.push(messages[++i]);
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.id && !answeredIds.has(toolCall.id)) {
        result.push(new ToolMessage({ content: DANGLING_TOOL_CALL_CONTENT, tool_call_id: toolCall.id, name: toolCall.name, status: 'error' }));
        answeredIds.add(toolCall.id);
        repaired++;
      }
    }
  }

  return { messages: repaired ? result : messages, repaired };
}

export function createDanglingToolCallsMiddleware() {
  return createMiddleware({
    name: 'DanglingToolCallsMiddleware',
    wrapModelCall: async (request, handler) => {
      const { messages, repaired } = repairDanglingToolCalls(request.messages);
      if (!repaired) {
        return handler(request);
      }
      logger.warn(`Patched ${repaired} tool call(s) without a result before calling the model`);
      return handler({ ...request, messages });
    },
  });
}
