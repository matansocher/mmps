import { Module } from '@nestjs/common';
import { GeminiModule } from '@services/gemini';
import { OpenaiModule } from '@services/openai';
import { AiService } from './ai.service';

@Module({
  imports: [GeminiModule, OpenaiModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
