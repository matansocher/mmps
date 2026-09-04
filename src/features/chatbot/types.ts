import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { ChatOpenAI } from '@langchain/openai';
import { AnyAgentMiddleware } from 'langchain';
import { z } from 'zod';
import { ToolCallbackOptions } from '@shared/ai';

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
  model: ChatAnthropic | ChatOpenAI;
  checkpointer?: BaseCheckpointSaver;
  middleware?: AnyAgentMiddleware[];
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
  images?: readonly string[]; // Base64 data URLs or public URLs sent as multimodal image blocks
  humanMessageId?: string; // Stable id assigned to the persisted human turn so it can be replaced post-run
};

export type ChatbotResponse = {
  message: string;
  toolResults: ToolResult[];
  timestamp: string;
};

export type StructuredChatbotResponse<T extends z.ZodTypeAny> = {
  readonly response: ChatbotResponse;
  readonly structured: z.infer<T>;
};

export type ProcessMessageOptions = {
  readonly images?: readonly string[]; // Base64 data URLs or public URLs passed to the model as image blocks
  // Scheduler-only: run the verbose instructions this turn, but persist only a short marker in the
  // durable thread so the giant prompt never enters the summarization budget or the Mongo summary.
  // The result still lands on the user's thread and stays replyable ("try again").
  readonly ephemeral?: EphemeralSchedulerPrompt;
};

export type EphemeralSchedulerPrompt = {
  readonly marker: string; // Short text persisted in place of the verbose prompt, e.g. '[scheduled: football predictions]'
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
