import { HumanMessage, isAIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { env } from 'node:process';
import { z } from 'zod';
import { getErrorMessage, Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { AgentDescriptor } from '../types';

const logger = new Logger('chatbot:agent-as-tool');

// Sub-agents run a scoped, deterministic model so their reasoning (e.g. betting/EV) is stable and
// independent of whatever model the main agent uses. gpt-4.1-mini supports temperature 0 (reasoning
// models like gpt-5-mini do not), which is why it is chosen here rather than reusing the parent model.
function createSubAgentModel(): ChatOpenAI {
  return new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY, timeout: 120_000 });
}

function getTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block): block is { readonly type: 'text'; readonly text: string } => {
      if (typeof block !== 'object' || block === null) return false;
      return 'type' in block && block.type === 'text' && 'text' in block && typeof block.text === 'string';
    })
    .map((block) => block.text)
    .join('');
}

const schema = z.object({
  request: z.string().describe("The full natural-language request to delegate to the sub-agent, in the user's own language"),
});

// Turn an AgentDescriptor into a single tool the parent agent can call ("agents-as-tools").
// The sub-agent runs its own scoped createAgent (own model + tools + prompt) in an isolated,
// stateless thread; only its final text answer is returned to the parent as a normal tool message,
// so the parent keeps its single canonical thread + checkpointer.
export function agentAsTool(descriptor: AgentDescriptor): DynamicStructuredTool<typeof schema> {
  const model = createSubAgentModel();
  const reactAgent = createAgent({ model, tools: descriptor.tools, systemPrompt: descriptor.prompt });

  async function runner({ request }: z.infer<typeof schema>): Promise<string> {
    try {
      const result = await reactAgent.graph.invoke({ messages: [new HumanMessage(request)] }, { recursionLimit: 25 });
      const messages: BaseMessage[] = result.messages ?? [];
      const lastAi = [...messages].reverse().find(isAIMessage);
      return (lastAi ? getTextContent(lastAi.content) : '').trim() || 'No answer produced.';
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error(`Sub-agent '${descriptor.name}' failed: ${errorMessage}`);
      return `The ${descriptor.name} sub-agent could not complete the request: ${errorMessage}`;
    }
  }

  return tool(runner, {
    name: toToolName(descriptor.name),
    description: descriptor.description ?? `Delegate a request to the ${descriptor.name} sub-agent.`,
    schema,
  });
}

// Derive a stable snake_case tool name from an agent name (e.g. 'CHATBOT_SPORTS' -> 'sports').
function toToolName(agentName: string): string {
  return agentName.toLowerCase().replace(/^chatbot[_-]?/, '') || agentName.toLowerCase();
}
