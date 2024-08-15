import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { PinBuddyMongoModule } from '@core/mongo/pin-buddy/pin-buddy-mongo.module';
import { PinBuddyModule } from '@services/pin-buddy';
import { BOTS } from '@services/telegram';
import { TelegramBotsFactoryModule } from '@services/telegram';
import { TelegramModule } from '@services/telegram';
import { UtilsModule } from '@services/utils';
import { PinBuddyBotService } from './pin-buddy-bot.service';

@Module({
  imports: [
    LoggerModule.forRoot(PinBuddyBotModule.name),
    UtilsModule,
    PinBuddyModule,
    PinBuddyMongoModule,
    TelegramModule,
    TelegramBotsFactoryModule.forRoot({ botName: BOTS.PIN_BUDDY.name }),
  ],
  providers: [PinBuddyBotService],
})
export class PinBuddyBotModule {}
