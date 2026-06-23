import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { InlineKeyboard } from 'grammy';
import { createAgent } from 'langchain';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { calendarTool, reminderTool } from '@shared/ai';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { buildInlineKeyboard } from '@services/telegram';
import { ACTION_AGENT_PROMPT, ACTION_CALLBACK_PREFIX } from './secretary.config';
import type { SecretaryAction } from './mongo';

export type ActionResult = {
  readonly ok: boolean;
  readonly text: string;
};

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
  private readonly logger = new Logger(SecretaryActionService.name);
  private readonly agent: any;

  constructor() {
    const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY });
    const reactAgent = createAgent({ model, tools: [calendarTool, reminderTool], systemPrompt: ACTION_AGENT_PROMPT });
    this.agent = reactAgent.graph;
  }

  // Run a single natural-language instruction through the agent and report success + a confirmation line.
  async execute(instruction: string): Promise<ActionResult> {
    try {
      const result = await this.agent.invoke({ messages: [new HumanMessage(instruction)] }, { recursionLimit: 25 });
      const messages: any[] = result?.messages ?? [];

      const toolMessages = messages.filter((m) => m?._getType?.() === 'tool');
      const anyFailure = toolMessages.some((m) => typeof m.content === 'string' && m.content.includes('"success":false'));
      const lastAi = [...messages].reverse().find((m) => m?._getType?.() === 'ai');
      const text = (typeof lastAi?.content === 'string' ? lastAi.content : '').trim() || 'Done.';

      const ok = toolMessages.length > 0 && !anyFailure;
      return { ok, text: ok ? text : text || 'The action could not be completed.' };
    } catch (err) {
      this.logger.error(`Action execution failed: ${err}`);
      return { ok: false, text: `Failed to perform the action: ${err}` };
    }
  }
}
