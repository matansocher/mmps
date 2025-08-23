import { BaseMessage } from '@langchain/core/messages';
import { ChatbotResponse, ToolResult } from './types';

/**
 * Formats agent result into chatbot response
 */
export function formatAgentResponse(result: any, chatId?: string): ChatbotResponse {
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
function extractToolResults(messages: BaseMessage[]): ToolResult[] {
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
