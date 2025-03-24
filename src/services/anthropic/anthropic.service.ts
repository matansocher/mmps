import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable } from '@nestjs/common';
import { ANTHROPIC_CLIENT_TOKEN, ANTHROPIC_MODEL } from './anthropic.config';

@Injectable()
export class AnthropicService {
  constructor(@Inject(ANTHROPIC_CLIENT_TOKEN) private readonly anthropic: Anthropic) {}

  async getChatCompletion(system: string, content: string): Promise<any> {
    const result = await this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
      system,
    });
    return { threadId: result.id, content: result.content };
  }
}
