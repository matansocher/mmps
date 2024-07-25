import { Module } from '@nestjs/common';
import { ImgurService } from './imgur.service';

@Module({
  providers: [ImgurService],
  exports: [ImgurService],
})
export class ImgurModule {}
