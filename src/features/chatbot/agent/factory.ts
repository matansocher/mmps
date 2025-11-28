import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { ToolCallbackHandler } from '@shared/ai';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { AiService } from './service';

export function createAgentService(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { name, tools = [] } = descriptor;
  const { model, checkpointer = new MemorySaver(), toolCallbackOptions } = opts;
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;
  const reactAgent = createAgent({ model, tools, systemPrompt: descriptor.prompt, checkpointer });
  return new AiService(reactAgent.graph as any, { name, callbacks });
}
