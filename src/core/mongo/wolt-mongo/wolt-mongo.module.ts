import { LoggerModule } from '@core/logger/logger.module';
import { WoltMongoService } from '@core/mongo/wolt-mongo/wolt-mongo.service';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@services/utils/utils.module';

@Module({
  imports: [LoggerModule, UtilsModule],
  providers: [WoltMongoService],
  exports: [WoltMongoService],
})
export class WoltMongoModule {}
