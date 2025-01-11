import { GoogleGenerativeAI } from '@google/generative-ai';
import { type FactoryProvider, Module } from '@nestjs/common';
import { GEMINI_API_KEY, GEMINI_FLASH_MODEL, GENERATIVE_MODEL_CLIENT_TOKEN } from './gemini.config';
import { GeminiService } from './gemini.service';
import { IGeminiClientProvider } from './interface';

export const GenerativeModelClientProvider: FactoryProvider = {
  provide: GENERATIVE_MODEL_CLIENT_TOKEN,
  useFactory: (): IGeminiClientProvider => {
    const generativeAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const flashModel = generativeAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL });
    return { flashModel };
  },
};

@Module({
  providers: [GeminiService, GenerativeModelClientProvider],
  exports: [GeminiService],
})
export class GeminiModule {}
