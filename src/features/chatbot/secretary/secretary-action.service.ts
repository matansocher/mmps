import { HumanMessage, isAIMessage, isToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { InlineKeyboard } from 'grammy';
import { createAgent } from 'langchain';
import { env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { buildInlineKeyboard } from '@services/telegram';
import { calendarTool, recordModelUsage, reminderTool, UsageCallbackHandler } from '@shared/ai';
import type { SecretaryAction } from './mongo';
import { ACTION_AGENT_PROMPT, ACTION_CALLBACK_PREFIX } from './secretary.config';

export type ActionResult = {
  readonly ok: boolean;
  readonly text: string;
};

type ActionAgentResult = {
  readonly messages?: BaseMessage[];
};

type ActionAgentInvoker = (instruction: string, usageHandler: UsageCallbackHandler) => Promise<ActionAgentResult>;

type ToolResponse = {
  readonly success?: boolean;
};

function createActionAgentInvoker(): ActionAgentInvoker {
  const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY, timeout: 120_000 });
  const reactAgent = createAgent({ model, tools: [calendarTool, reminderTool], systemPrompt: ACTION_AGENT_PROMPT });

  return async (instruction, usageHandler) => reactAgent.graph.invoke({ messages: [new HumanMessage(instruction)] }, { recursionLimit: 25, callbacks: [usageHandler] });
}

function getTextContent(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;

  const text = content
    .filter((block): block is { readonly type: 'text'; readonly text: string } => {
      if (typeof block !== 'object' || block === null) return false;
      return 'type' in block && block.type === 'text' && 'text' in block && typeof block.text === 'string';
    })
    .map((block) => block.text)
    .join('');

  return text || null;
}

function parseToolResponse(content: unknown): ToolResponse | null {
  const text = getTextContent(content);
  if (!text) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    if ('success' in parsed && typeof parsed.success !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

// Render the action buttons for a summary message, reflecting each action's current status.
export function buildActionsKeyboard(actions: ReadonlyArray<Pick<SecretaryAction, 'shortId' | 'label' | 'status'>>): InlineKeyboard {
  return buildInlineKeyboard(
    actions.map((action) => ({
      text: `${action.status === 'done' ? '✅ ' : action.status === 'failed' ? '❌ ' : ''}${action.label}`,
      data: `${ACTION_CALLBACK_PREFIX}${action.shortId}`,
    })),
  );
}

export class SecretaryActionService {
  private readonly logger = new Logger('chatbot:secretary-action');

  constructor(private readonly invokeAgent: ActionAgentInvoker = createActionAgentInvoker()) {}

  // Run a single natural-language instruction through the agent and report success + a confirmation line.
  async execute(instruction: string): Promise<ActionResult> {
    try {
      const usageHandler = new UsageCallbackHandler();
      const startedAt = Date.now();
      const result = await this.invokeAgent(instruction, usageHandler);
      recordModelUsage({ source: 'chatbot-secretary', handler: usageHandler, durationMs: Date.now() - startedAt });
      const messages = result.messages ?? [];

      const toolMessages = messages.filter(isToolMessage);
      const toolResponses = toolMessages.map((message) => parseToolResponse(message.content));
      const lastAi = [...messages].reverse().find(isAIMessage);
      const text = (lastAi ? getTextContent(lastAi.content) : null)?.trim() || 'Done.';

      const ok = toolResponses.length > 0 && toolResponses.every((response) => response !== null && response.success !== false);
      return { ok, text };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`Action execution failed: ${errorMessage}`);
      return { ok: false, text: `Failed to perform the action: ${errorMessage}` };
    }
  }
}
