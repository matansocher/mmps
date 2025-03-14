import { OpenAI } from 'openai';
import { type FactoryProvider, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenaiAssistantService } from './openai-assistant.service';
import { OPENAI_CLIENT_TOKEN } from './openai.config';
import { OpenaiService } from './openai.service';

export const OpenAiClientProvider: FactoryProvider = {
  provide: OPENAI_CLIENT_TOKEN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): OpenAI => new OpenAI({ apiKey: configService.getOrThrow<string>('OPEN_AI_API_KEY') }),
};

@Module({
  providers: [OpenaiService, OpenaiAssistantService, OpenAiClientProvider],
  exports: [OpenaiService, OpenaiAssistantService],
})
export class OpenaiModule {}
