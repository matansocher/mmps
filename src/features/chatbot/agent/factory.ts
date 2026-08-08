import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { type ToolRuntime, tool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { z } from 'zod';
import { ToolCallbackHandler } from '@shared/ai';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { AiService } from './service';

function isOrchestrator(descriptor: AgentDescriptor | OrchestratorDescriptor): descriptor is OrchestratorDescriptor {
  return Array.isArray((descriptor as OrchestratorDescriptor).agents);
}

const delegateSchema = z.object({
  request: z.string().describe('The complete, self-contained task or question to delegate, including any relevant context from the conversation. The specialist has no access to chat history.'),
});

// Wraps a specialist as a stateless ReAct sub-agent exposed to the supervisor as a single tool.
// Conversation memory lives at the supervisor level, so specialists get no checkpointer and are
// invoked fresh each turn with a self-contained request. runtime.config is forwarded so parent
// callbacks (usage/cost tracking) propagate into the specialist's model calls.
function buildSpecialistTool(descriptor: AgentDescriptor, model: ChatAnthropic | ChatOpenAI) {
  const specialist = createAgent({ model, tools: descriptor.tools, systemPrompt: descriptor.prompt });

  return tool(
    async ({ request }: z.infer<typeof delegateSchema>, runtime: ToolRuntime) => {
      const result = await specialist.graph.invoke({ messages: [new HumanMessage(request)] }, runtime?.config);
      const messages = result.messages ?? [];
      const last = messages[messages.length - 1];
      const content = last?.content;
      return typeof content === 'string' ? content : JSON.stringify(content ?? '');
    },
    {
      name: `delegate_to_${descriptor.name.toLowerCase()}`,
      description: descriptor.description ?? `Delegate a request to the ${descriptor.name} specialist.`,
      schema: delegateSchema,
    },
  );
}

export function createAgentService(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { model, checkpointer = new MemorySaver(), middleware, toolCallbackOptions } = opts;
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;

  const tools = isOrchestrator(descriptor) ? [...(descriptor.tools ?? []), ...descriptor.agents.map((agent) => buildSpecialistTool(agent, model))] : (descriptor.tools ?? []);

  const reactAgent = createAgent({ model, tools, systemPrompt: descriptor.prompt, checkpointer, middleware });
  return new AiService(reactAgent.graph as any, { name: descriptor.name, callbacks });
}
