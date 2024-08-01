import { LoggerModule } from '@core/logger/logger.module';
import { Module } from '@nestjs/common';
import { PinBuddyModule } from '@services/pin-buddy/pin-buddy.module';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { UtilsModule } from '@services/utils/utils.module';
import { PinBuddyBotService } from './pin-buddy-bot.service';

@Module({
  imports: [
    LoggerModule.forRoot(PinBuddyBotModule.name),
    UtilsModule,
    PinBuddyModule,
    TelegramModule,
    TelegramBotsFactoryModule.forRoot({ botName: BOTS.PIN_BUDDY.name }),
  ],
  providers: [PinBuddyBotService],
})
export class PinBuddyBotModule {}
