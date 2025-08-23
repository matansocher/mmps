import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ChatbotResponse, InvokeOptions, MessageState, ToolExecutionContext, ToolInstance, ToolParameter, ToolResult } from './types';

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

/**
 * Formats agent result into chatbot response
 */
export function formatAgentResponse(result: any, userId?: string): ChatbotResponse {
  const messages = result.messages as BaseMessage[];
  const lastMessage = messages[messages.length - 1];
  const responseContent = lastMessage.content as string;

  const toolResults = extractToolResults(messages);

  return {
    message: responseContent,
    toolResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extracts tool results from conversation messages
 */
export function extractToolResults(messages: BaseMessage[]): ToolResult[] {
  const toolResults: ToolResult[] = [];

  // Look through messages to find tool calls and results
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.additional_kwargs?.tool_calls) {
      const toolCalls = message.additional_kwargs.tool_calls;
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;

        // Find the corresponding tool result
        const nextMessage = messages[i + 1];
        if (nextMessage && nextMessage.content) {
          try {
            const toolData = JSON.parse(nextMessage.content as string);
            toolResults.push({
              toolName,
              data: toolData,
              error: undefined,
            });
          } catch {
            // If parsing fails, treat as plain text result
            toolResults.push({
              toolName,
              data: nextMessage.content,
              error: undefined,
            });
          }
        }
      }
    }
  }

  return toolResults;
}

/**
 * Creates error response
 */
export function createErrorResponse(error: Error | string, userId?: string): ChatbotResponse {
  const errorMessage = error instanceof Error ? error.message : error;

  return {
    message: 'I apologize, but I encountered an error while processing your request. Please try again.',
    toolResults: [
      {
        toolName: 'system',
        data: null,
        error: errorMessage,
      },
    ],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates appropriate Zod type based on parameter type
 */
function createZodType(param: ToolParameter) {
  switch (param.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    default:
      return z.string();
  }
}

/**
 * Creates a LangChain tool from a custom tool instance
 */
export function createLangChainTool(tool: ToolInstance): DynamicStructuredTool {
  const parameters = tool.getParameters();

  // Use provided schema or generate from parameters
  const schema = tool.getSchema() || createSchemaFromParameters(parameters);

  return new DynamicStructuredTool({
    name: tool.getName(),
    description: tool.getDescription(),
    schema,
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
 * Creates Zod schema from tool parameters
 */
function createSchemaFromParameters(parameters: ToolParameter[]): z.ZodObject<any> {
  const schemaFields: Record<string, any> = {};

  for (const param of parameters) {
    const zodType = createZodType(param);

    if (param.required) {
      schemaFields[param.name] = zodType.describe(param.description);
    } else {
      schemaFields[param.name] = zodType.optional().describe(param.description);
    }
  }

  return z.object(schemaFields);
}

/**
 * Validates tool execution context
 */
export function validateToolContext(context: ToolExecutionContext): boolean {
  return !!(context && context.parameters && typeof context.userRequest === 'string');
}
