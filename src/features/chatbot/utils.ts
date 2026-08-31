import { BaseMessage } from '@langchain/core/messages';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
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

// Sentinel marker the agent appends so a small structured value (e.g. { hasMatches: true }) rides
// along on the same turn, avoiding a second LLM call to extract it. Parsed and stripped in code.
const STRUCTURED_SENTINEL = '@@STRUCTURED@@';

export function buildStructuredInstruction<T extends z.ZodTypeAny>(responseSchema: T): string {
  const jsonSchema = JSON.stringify(zodShapeHint(responseSchema));
  return `\n\nAfter your user-facing message, on a new final line, output exactly this marker followed by a single-line JSON object matching this shape: ${STRUCTURED_SENTINEL} ${jsonSchema}\nOutput the marker line last, only once, with no code fences and no extra text after it.`;
}

// Best-effort hint of the expected keys for the sentinel line. Falls back to an empty object.
function zodShapeHint(schema: z.ZodTypeAny): Record<string, string> {
  const def: any = (schema as any)?._def;
  const shape = typeof def?.shape === 'function' ? def.shape() : def?.shape;
  if (!shape) {
    return {};
  }
  const hint: Record<string, string> = {};
  for (const key of Object.keys(shape)) {
    const typeName = shape[key]?._def?.typeName ?? 'ZodUnknown';
    hint[key] = typeName.replace(/^Zod/, '').toLowerCase();
  }
  return hint;
}

// Splits an agent response into the user-facing message and the parsed structured value carried on
// the sentinel line. If the sentinel is missing or invalid, `structured` is null and the caller
// falls back. Never throws.
export function parseStructuredResponse<T extends z.ZodTypeAny>(message: string, responseSchema: T): { readonly message: string; readonly structured: z.infer<T> | null } {
  const index = message.lastIndexOf(STRUCTURED_SENTINEL);
  if (index === -1) {
    return { message, structured: null };
  }

  const cleanMessage = message.slice(0, index).trimEnd();
  const raw = message.slice(index + STRUCTURED_SENTINEL.length).trim();

  try {
    const parsed = responseSchema.parse(JSON.parse(raw));
    return { message: cleanMessage, structured: parsed as z.infer<T> };
  } catch {
    return { message: cleanMessage, structured: null };
  }
}
