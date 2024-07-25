import { WoltMongoService } from '@core/mongo/wolt-mongo/wolt-mongo.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [WoltMongoService],
  exports: [WoltMongoService],
})
export class WoltMongoModule {}
