import { OpenAI } from 'openai';
import { type FactoryProvider, Module } from '@nestjs/common';
import { OPENAI_API_KEY, OPENAI_CLIENT_TOKEN } from '@services/openai/openai.config';
import { OpenaiService } from './openai.service';

export const OpenAiClientProvider: FactoryProvider = {
  provide: OPENAI_CLIENT_TOKEN,
  useFactory: (): OpenAI => new OpenAI({ apiKey: OPENAI_API_KEY }),
};

@Module({
  providers: [OpenaiService, OpenAiClientProvider],
  exports: [OpenaiService],
})
export class OpenaiModule {}
