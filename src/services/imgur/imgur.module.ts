import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { ImgurService } from './imgur.service';

@Module({
  imports: [LoggerModule.forChild(ImgurModule.name), UtilsModule],
  providers: [ImgurService],
  exports: [ImgurService],
})
export class ImgurModule {}
