import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable } from '@nestjs/common';
import { ANTHROPIC_CLIENT_TOKEN, ANTHROPIC_DEFAULT_MAX_TOKENS, ANTHROPIC_MODEL } from './anthropic.config';
import { Tool } from './interface';

@Injectable()
export class AnthropicService {
  constructor(@Inject(ANTHROPIC_CLIENT_TOKEN) private readonly anthropic: Anthropic) {}

  async getChatCompletion(system: string, content: string): Promise<any> {
    const result = await this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content }],
      system,
    });
    return { threadId: result.id, content: result.content };
  }

  async executeTool<T>(tool: Tool, content: string): Promise<T> {
    try {
      const response = await this.anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_DEFAULT_MAX_TOKENS,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content }],
      });

      for (const content of response.content) {
        if (content.type === 'tool_use' && content.name === tool.name) {
          return content.input as T;
        }
      }

      throw new Error('No tool output found in the response');
    } catch (error) {
      console.error(`Error executing tool ${tool.name}:`, error);
      return null;
    }
  }
}
