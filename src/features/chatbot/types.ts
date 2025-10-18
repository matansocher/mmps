import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { ToolCallbackOptions } from './agent/tool-callback-handler';

export type AgentDescriptor = {
  name: string;
  description?: string;
  prompt: string;
  tools: (DynamicTool | DynamicStructuredTool<any>)[];
};

export type OrchestratorDescriptor = Omit<AgentDescriptor, 'description' | 'tools'> & {
  agents: AgentDescriptor[];
  tools?: AgentDescriptor['tools'];
};

export type CreateAgentOptions = {
  llm: ChatAnthropic;
  checkpointSaver?: MemorySaver;
  responseFormat?: any;
  toolCallbackOptions?: ToolCallbackOptions;
};

export type AiServiceOptions = {
  name: string;
  recursionLimit?: number;
  callbacks?: any[];
};

export type InvokeOptions = {
  threadId?: string;
  system?: string;
  callbacks?: any[];
  recursionLimit?: number;
};

export type ChatbotResponse = {
  message: string;
  toolResults: ToolResult[];
  timestamp: string;
};

export type ToolResult = {
  toolName: string;
  data: any;
  error?: string;
};

export type MessageState = {
  messages: BaseMessage[];
  [key: string]: any; // index signature for LangGraph compatibility
};
