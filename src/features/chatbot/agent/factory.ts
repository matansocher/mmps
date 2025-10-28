// import { DynamicTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ToolCallbackHandler } from '@shared/ai';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { AiService } from './service';

export function createAgent(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { name, tools = [] } = descriptor;
  const { llm, checkpointSaver = new MemorySaver(), toolCallbackOptions } = opts;

  // Handle multi-agent orchestration
  if ('agents' in descriptor && Array.isArray(descriptor.agents)) {
    for (const agent of descriptor.agents) {
      // For now, we'll skip the orchestration and just use the tools directly
      // In a full implementation, you would convert agent to tools
      console.log(`Orchestrator would include agent: ${agent.name}`);
    }
  }

  // Create tool callback handler if options provided
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;

  // const wrappedTools = tools.map((tool) => wrapToolWithLogging(tool));
  // const reactAgent = createReactAgent({ llm, tools: wrappedTools, checkpointSaver });
  const reactAgent = createReactAgent({ llm, tools, checkpointSaver });
  return new AiService(reactAgent, { name, callbacks });
}

// export function asTool(agent: AiService): DynamicTool {
//   return new DynamicTool({
//     name: agent.name.toLowerCase().replace(/\s+/g, '_'),
//     description: `Calls the ${agent.name} agent`,
//     func: async (input: string) => {
//       try {
//         const result = await agent.invoke(input);
//         if (result && typeof result === 'object' && 'messages' in result) {
//           const messages = result.messages as any[];
//           const lastMessage = messages[messages.length - 1];
//           return lastMessage.content as string;
//         }
//         return String(result);
//       } catch (err) {
//         return `Error calling ${agent.name}: ${err.message}`;
//       }
//     },
//   });
// }
