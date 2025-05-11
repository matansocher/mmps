import Anthropic from '@anthropic-ai/sdk';
import { type FactoryProvider, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ANTHROPIC_CLIENT_TOKEN } from './anthropic.config';
import { AnthropicService } from './anthropic.service';

export const AnthropicClientProvider: FactoryProvider = {
  provide: ANTHROPIC_CLIENT_TOKEN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Anthropic => {
    const apiKey = configService.get('ANTHROPIC_API_KEY');
    return new Anthropic({ apiKey });
  },
};

@Module({
  providers: [AnthropicService, AnthropicClientProvider],
  exports: [AnthropicService],
})
export class AnthropicModule {}
