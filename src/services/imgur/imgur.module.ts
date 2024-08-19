import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { ImgurService } from './imgur.service';

@Module({
  imports: [LoggerModule.forRoot(ImgurModule.name), UtilsModule],
  providers: [ImgurService],
  exports: [ImgurService],
})
export class ImgurModule {}
