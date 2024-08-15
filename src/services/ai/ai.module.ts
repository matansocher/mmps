import { Module } from '@nestjs/common';
import { GeminiModule } from '@services/gemini/gemini.module';
import { ImgurModule } from '@services/imgur/imgur.module';
import { OpenaiModule } from '@services/openai/openai.module';
import { AiService } from './ai.service';

@Module({
  imports: [GeminiModule, OpenaiModule, ImgurModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
