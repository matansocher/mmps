import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { InvokeOptions, MessageState, ToolInstance } from '../types';

/**
 * Creates a LangChain tool from a custom tool instance
 */
export function createLangChainTool(tool: ToolInstance): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: tool.getName(),
    description: tool.getDescription(),
    schema: tool.getSchema(),
    func: async (input: Record<string, any>) => {
      try {
        const result = await tool.execute({
          userRequest: '',
          parameters: input,
        });
        return JSON.stringify(result);
      } catch (error) {
        return `Error: ${error.message}`;
      }
    },
  });
}

/**
 * Creates a message state for agent processing
 */
export function createMessage(message: string, opts: Partial<InvokeOptions> = {}): MessageState {
  const messages: BaseMessage[] = [];
  if (opts.system) {
    messages.push(new SystemMessage(opts.system));
  }
  messages.push(new HumanMessage(message));
  return { messages };
}
