import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { PinBuddyMongoModule } from '@core/mongo/pin-buddy/pin-buddy-mongo.module';
import { PinBuddyService } from '@services/pin-buddy';
import { PinBuddyUtilsService } from '@services/pin-buddy';
import { UtilsModule } from '@services/utils';

@Module({
  imports: [LoggerModule.forRoot(PinBuddyModule.name), UtilsModule, PinBuddyMongoModule],
  providers: [PinBuddyService, PinBuddyUtilsService],
  exports: [PinBuddyService, PinBuddyUtilsService],
})
export class PinBuddyModule {}
