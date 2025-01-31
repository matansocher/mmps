import { GoogleGenerativeAI } from '@google/generative-ai';
import { type FactoryProvider, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GEMINI_FLASH_MODEL, GENERATIVE_MODEL_CLIENT_TOKEN } from './gemini.config';
import { GeminiService } from './gemini.service';
import { GeminiClientProvider } from './interface';

export const GenerativeModelClientProvider: FactoryProvider = {
  provide: GENERATIVE_MODEL_CLIENT_TOKEN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): GeminiClientProvider => {
    const generativeAI = new GoogleGenerativeAI(configService.get('GEMINI_API_KEY'));
    const flashModel = generativeAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL });
    return { flashModel };
  },
};

@Module({
  providers: [GeminiService, GenerativeModelClientProvider],
  exports: [GeminiService],
})
export class GeminiModule {}
