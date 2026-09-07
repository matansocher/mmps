import { ChatAnthropic } from '@langchain/anthropic';
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
  signal?: AbortSignal; // Wall-clock deadline for the whole turn; aborts the run when it fires
  images?: readonly string[]; // Base64 data URLs or public URLs sent as multimodal image blocks
  // Invocation metadata for tracing/correlation. Only safe correlation identifiers belong here —
  // never raw prompts, emails, image payloads, or credentials.
  runId?: string; // Correlation ID for the tracer run; a UUID is generated when omitted
  runName?: string; // Human-readable run name for the trace (e.g. 'chatbot.turn')
  invocationSource?: string; // Where the turn originated (e.g. 'chatbot', 'chatbot-secretary')
  requestId?: string; // Upstream request identifier to correlate across systems
  tags?: readonly string[]; // Tags applied to the run and its sub-calls for filtering
  metadata?: Record<string, unknown>; // Extra JSON-serializable correlation metadata (no sensitive content)
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
};

export type ToolResult = {
  toolName: string;
  data: any;
  error?: string;
};
