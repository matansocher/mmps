import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { PinBuddyMongoModule } from '@core/mongo/pin-buddy/pin-buddy-mongo.module';
import { PinBuddyModule } from '@services/pin-buddy/pin-buddy.module';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { UtilsModule } from '@core/utils/utils.module';
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
