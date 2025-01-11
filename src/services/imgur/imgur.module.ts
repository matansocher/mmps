import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { ImgurService } from './imgur.service';

@Module({
  imports: [LoggerModule.forChild(ImgurModule.name)],
  providers: [ImgurService],
  exports: [ImgurService],
})
export class ImgurModule {}
