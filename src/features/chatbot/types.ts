import { BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { CompiledStateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// Agent descriptor for single agent
export interface AgentDescriptor {
  name: string;
  description?: string;
  prompt: string;
  tools: (DynamicTool | DynamicStructuredTool<any>)[];
}

// Orchestrator descriptor for multi-agent systems
export interface OrchestratorDescriptor extends Omit<AgentDescriptor, 'description' | 'tools'> {
  agents: AgentDescriptor[];
  tools?: AgentDescriptor['tools'];
}

// Options for creating agent
export interface CreateAgentOptions {
  llm: ChatOpenAI;
  checkpointSaver?: MemorySaver;
  responseFormat?: any;
}

// AI service configuration
export interface AiServiceOptions {
  name: string;
  recursionLimit?: number;
}

// Service invoke options
export interface InvokeOptions {
  threadId?: string;
  system?: string;
  callbacks?: any[];
  recursionLimit?: number;
}

// Agent state interface
export interface AgentState {
  messages: any[];
  [key: string]: any;
}

// Compiled agent type
export type CompiledAgent = CompiledStateGraph<any, any>;

// Core chatbot types
export interface ChatbotRequest {
  message: string;
  chatId: string;
  requestedTools?: string[];
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

// Message state for agent processing
export interface MessageState {
  messages: BaseMessage[];
  [key: string]: any; // Index signature for LangGraph compatibility
}

// Tool parameter definition
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
}

// Tool configuration
export interface ToolConfig {
  name: string;
  description: string;
  parameters: ToolParameter[];
  schema: z.ZodObject<any>;
  keywords: string[];
  instructions?: string;
}

// Tool execution context
export interface ToolExecutionContext {
  userRequest: string;
  parameters: Record<string, any>;
}

// Tool function type
export type ToolFunction = (context: ToolExecutionContext) => Promise<any>;

// Tool interface
export interface Tool {
  config: ToolConfig;
  execute: ToolFunction;
  extractParameters?: (userRequest: string) => Record<string, any>;
}

// Tool instance interface (for existing tools)
export interface ToolInstance {
  getName(): string;
  getDescription(): string;
  getParameters(): ToolParameter[];
  getSchema(): z.ZodObject<any>;
  getKeywords(): string[];
  getInstructions?(): string;
  extractParameters?(userRequest: string): Record<string, any>;
  execute(context: ToolExecutionContext): Promise<any>;
}

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
}

export interface SportsGame {
  homeTeam: string;
  awayTeam: string;
  score?: string;
  status: string;
  date: string;
  league: string;
}
