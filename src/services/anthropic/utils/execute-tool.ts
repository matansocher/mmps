import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { ANTHROPIC_DEFAULT_MAX_TOKENS, ANTHROPIC_OPUS_MODEL } from '../constants';
import { provideAnthropicClient } from '../provide-anthropic-client';

const logger = new Logger('AnthropicToolExecutor');

export type Tool = Anthropic.Messages.Tool;

export async function executeTool<T>(tool: Tool, content: string): Promise<T> {
  const anthropic = provideAnthropicClient();
  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_OPUS_MODEL,
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
  } catch (err) {
    logger.error(`Error executing tool ${tool.name}: ${err}`);
    return null;
  }
}
