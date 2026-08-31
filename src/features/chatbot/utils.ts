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

  // Index ToolMessage results by their tool_call_id. The model emits parallel tool calls,
  // so a single AIMessage can carry several tool_calls followed by several ToolMessages;
  // positional pairing would attach the wrong result to every call after the first.
  const resultsByToolCallId = new Map<string, unknown>();
  for (const message of messages) {
    const toolCallId = (message as any).tool_call_id;
    if (toolCallId && message.content != null) {
      resultsByToolCallId.set(toolCallId, message.content);
    }
  }

  for (const message of messages) {
    const toolCalls = (message as any).tool_calls || (message as any).additional_kwargs?.tool_calls || (message as any).kwargs?.tool_calls;
    if (!toolCalls) continue;

    for (const toolCall of toolCalls) {
      const toolName = toolCall.name || toolCall.function?.name;
      const toolCallId = toolCall.id ?? toolCall.tool_call_id;
      if (toolCallId == null || !resultsByToolCallId.has(toolCallId)) continue;

      const content = resultsByToolCallId.get(toolCallId);
      try {
        const toolData = JSON.parse(content as string);
        toolResults.push({ toolName, data: toolData, error: undefined });
      } catch {
        toolResults.push({ toolName, data: content, error: undefined });
      }
    }
  }

  return toolResults;
}
