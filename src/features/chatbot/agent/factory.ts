import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { ToolCallbackHandler } from '@shared/ai';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { AiService } from './service';

function createChatbotAgent(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions) {
  const { tools = [] } = descriptor;
  const { model, checkpointer = new MemorySaver(), middleware } = opts;
  return createAgent({ model, tools, systemPrompt: descriptor.prompt, checkpointer, middleware });
}

export type ChatbotAgent = ReturnType<typeof createChatbotAgent>;

export function createAgentService(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { name } = descriptor;
  const { toolCallbackOptions } = opts;
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;
  const agent = createChatbotAgent(descriptor, opts);
  return new AiService(agent, { name, callbacks });
}
