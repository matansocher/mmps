import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ToolCallbackOptions } from '@shared/ai';

export type AgentDescriptor = {
  name: string;
  description?: string;
  prompt: string;
  tools: (DynamicTool | DynamicStructuredTool<any>)[];
};

export type CreateAgentOptions = {
  model: ChatAnthropic | ChatOpenAI;
  checkpointer?: MemorySaver;
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

export type SugarResponse = {
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
  [key: string]: any;
};
