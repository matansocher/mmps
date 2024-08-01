import { LoggerModule } from '@core/logger/logger.module';
// import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.module';
import { Module } from '@nestjs/common';
import { PinBuddyUtilsService } from '@services/pin-buddy/pin-buddy-utils.service';
import { PinBuddyService } from '@services/pin-buddy/pin-buddy.service';
import { UtilsModule } from '@services/utils/utils.module';
import { UserSelectedActionsService } from '@services/pin-buddy/user-selected-actions.service';

@Module({
  imports: [
    LoggerModule.forRoot(PinBuddyModule.name),
    UtilsModule,
    // VoicePalMongoModule,
  ],
  providers: [PinBuddyService, PinBuddyUtilsService, UserSelectedActionsService],
  exports: [PinBuddyService, UserSelectedActionsService],
})
export class PinBuddyModule {}
