import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';

export interface AgentDescriptor {
  name: string;
  description?: string;
  prompt: string;
  tools: (DynamicTool | DynamicStructuredTool<any>)[];
}

export interface OrchestratorDescriptor extends Omit<AgentDescriptor, 'description' | 'tools'> {
  agents: AgentDescriptor[];
  tools?: AgentDescriptor['tools'];
}

export interface CreateAgentOptions {
  llm: ChatAnthropic;
  checkpointSaver?: MemorySaver;
  responseFormat?: any;
}

export interface AiServiceOptions {
  name: string;
  recursionLimit?: number;
}

export interface InvokeOptions {
  threadId?: string;
  system?: string;
  callbacks?: any[];
  recursionLimit?: number;
}

export interface ChatbotResponse {
  message: string;
  toolResults: ToolResult[];
  timestamp: string;
}

export interface ToolResult {
  toolName: string;
  data: any;
  error?: string;
}

export interface MessageState {
  messages: BaseMessage[];
  [key: string]: any; // index signature for LangGraph compatibility
}
