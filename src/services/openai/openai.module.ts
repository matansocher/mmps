import { Module } from '@nestjs/common';
import { OpenaiService } from '@services/openai';

@Module({
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
