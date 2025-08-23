// import { DynamicTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { AiService } from './service';

export function createAgent(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { name, prompt, tools = [] } = descriptor;
  const { llm, checkpointSaver = new MemorySaver(), responseFormat } = opts;

  // Handle multi-agent orchestration
  if ('agents' in descriptor && Array.isArray(descriptor.agents)) {
    for (const agent of descriptor.agents) {
      // For now, we'll skip the orchestration and just use the tools directly
      // In a full implementation, you would convert agent to tools
      console.log(`Orchestrator would include agent: ${agent.name}`);
    }
  }

  // Create the React agent
  const reactAgent = createReactAgent({
    llm,
    tools,
    checkpointSaver,
  });

  // Wrap in AiService
  return new AiService(reactAgent, { name });
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
//       } catch (error) {
//         return `Error calling ${agent.name}: ${error.message}`;
//       }
//     },
//   });
// }
