import { BaseMessage } from '@langchain/core/messages';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ChatbotResponse, ToolResult } from './types';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function fileToDataUrl(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const mimeType = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? 'image/jpeg';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export function formatAgentResponse(result: any): ChatbotResponse {
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

function extractToolResults(messages: BaseMessage[]): ToolResult[] {
  const toolResults: ToolResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i] as any;
    if (message.tool_calls || message.additional_kwargs?.tool_calls || message.kwargs?.tool_calls) {
      const toolCalls = message.tool_calls || message.additional_kwargs.tool_calls || message.kwargs.tool_calls;
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;

        const nextMessage = messages[i + 1];
        if (nextMessage && nextMessage.content) {
          try {
            const toolData = JSON.parse(nextMessage.content as string);
            toolResults.push({ toolName, data: toolData, error: undefined });
          } catch {
            toolResults.push({ toolName, data: nextMessage.content, error: undefined });
          }
        }
      }
    }
  }

  return toolResults;
}
