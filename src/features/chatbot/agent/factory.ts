import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { ToolCallbackHandler } from '@shared/ai';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { agentAsTool } from './agent-as-tool';
import { AiService } from './service';

function isOrchestrator(descriptor: AgentDescriptor | OrchestratorDescriptor): descriptor is OrchestratorDescriptor {
  return Array.isArray((descriptor as OrchestratorDescriptor).agents);
}

export function createAgentService(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { name, tools = [] } = descriptor;
  const { model, checkpointer = new MemorySaver(), middleware, toolCallbackOptions } = opts;
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;

  // Consume OrchestratorDescriptor.agents by turning each sub-agent into a single callable tool
  // ("agents-as-tools"). Sub-agent results land back in this agent's thread as normal tool messages,
  // so the parent keeps its single canonical thread + checkpointer + summarization untouched.
  const agentTools = isOrchestrator(descriptor) ? descriptor.agents.map(agentAsTool) : [];
  const allTools = [...tools, ...agentTools];

  const reactAgent = createAgent({ model, tools: allTools, systemPrompt: descriptor.prompt, checkpointer, middleware });
  return new AiService(reactAgent.graph as any, { name, callbacks });
}
