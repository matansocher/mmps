import { Module } from '@nestjs/common';
import { GeminiModule } from '@services/gemini';
import { ImgurModule } from '@services/imgur';
import { OpenaiModule } from '@services/openai';
import { AiService } from './ai.service';

@Module({
  imports: [GeminiModule, OpenaiModule, ImgurModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
