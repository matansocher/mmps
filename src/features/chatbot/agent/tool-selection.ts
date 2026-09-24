import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';
import { z } from 'zod';
import { getErrorMessage, Logger } from '@core/utils';

const logger = new Logger('chatbot:tool-selection');

const RECENT_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 600;
const MAX_DESCRIPTION_CHARS = 300;
const MAX_CACHED_TURNS = 200;

const SELECTOR_PROMPT = `You choose which tools a personal-assistant agent may use for the user's latest message.

Rules:
- Select every tool the agent could need to fully handle the latest message, including tools for follow-up steps (e.g. a lookup before an action, or a list before a remove).
- Use the recent conversation to resolve short follow-ups ("yes", "send it", "and tomorrow?", "delete the second one").
- When unsure whether a tool is needed, include it.
- Return an empty list only for small talk or questions that need no tool at all.`;

type NamedTool = { readonly name: string; readonly description: string };

export type ToolSelectionOptions = {
  readonly model: BaseChatModel;
  readonly alwaysInclude?: readonly string[];
};

function isNamedTool(tool: unknown): tool is NamedTool {
  return typeof tool === 'object' && tool !== null && typeof (tool as NamedTool).name === 'string' && typeof (tool as NamedTool).description === 'string';
}

function truncate(text: string, maxChars: number): string {
  const trimmed = text.trim();
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}…` : trimmed;
}

function findLastHumanIndex(messages: BaseMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (HumanMessage.isInstance(messages[i])) {
      return i;
    }
  }
  return -1;
}

function formatTranscript(messages: BaseMessage[]): string {
  return messages
    .filter((message) => HumanMessage.isInstance(message) || (AIMessage.isInstance(message) && message.text))
    .slice(-RECENT_MESSAGES)
    .map((message) => `${HumanMessage.isInstance(message) ? 'User' : 'Assistant'}: ${truncate(message.text, MAX_MESSAGE_CHARS)}`)
    .join('\n');
}

function formatCatalog(tools: readonly NamedTool[]): string {
  return tools.map((tool) => `- ${tool.name}: ${truncate(tool.description.split('\n\n')[0], MAX_DESCRIPTION_CHARS)}`).join('\n');
}

// Narrows the tools sent to the main model to the ones relevant for the current turn. A small model
// picks them once per user message (cached by message id), so every step of a multi-step turn sees
// the same tool set. Any selector failure falls back to all tools, so a turn never breaks because of it.
export function createToolSelectionMiddleware({ model, alwaysInclude = [] }: ToolSelectionOptions) {
  const selections = new Map<string, readonly string[]>();

  async function selectTools(tools: readonly NamedTool[], messages: BaseMessage[], signal?: AbortSignal): Promise<readonly string[] | undefined> {
    const names = tools.map((tool) => tool.name) as [string, ...string[]];
    const schema = z.object({ tools: z.array(z.enum(names)).describe('Names of the tools the agent may need, most relevant first') });
    try {
      const prompt = `Available tools:\n${formatCatalog(tools)}\n\nRecent conversation (last line is the latest message):\n${formatTranscript(messages)}`;
      const result = await model.withStructuredOutput(schema, { name: 'select_tools' }).invoke([new SystemMessage(SELECTOR_PROMPT), new HumanMessage(prompt)], { signal });
      return result.tools;
    } catch (err) {
      logger.warn(`Tool selection failed, using all tools: ${getErrorMessage(err)}`);
      return undefined;
    }
  }

  return createMiddleware({
    name: 'ToolSelectionMiddleware',
    wrapModelCall: async (request, handler) => {
      const selectable = request.tools.filter(isNamedTool).filter((tool) => !alwaysInclude.includes(tool.name));
      const lastHumanIndex = findLastHumanIndex(request.messages);
      if (!selectable.length || lastHumanIndex < 0) {
        return handler(request);
      }

      const turnId = request.messages[lastHumanIndex].id;
      let selected = turnId ? selections.get(turnId) : undefined;
      if (!selected) {
        selected = await selectTools(selectable, request.messages.slice(0, lastHumanIndex + 1), request.runtime.signal);
        if (!selected) {
          return handler(request);
        }
        if (turnId) {
          selections.set(turnId, selected);
          if (selections.size > MAX_CACHED_TURNS) {
            selections.delete(selections.keys().next().value);
          }
        }
      }

      const allowed = new Set([...selected, ...alwaysInclude]);
      return handler({ ...request, tools: request.tools.filter((tool) => !isNamedTool(tool) || allowed.has(tool.name)) });
    },
  });
}
