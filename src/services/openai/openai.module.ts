import { Module } from '@nestjs/common';
import { OpenaiService } from '@services/openai/openai.service';

@Module({
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
