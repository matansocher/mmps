import { Module } from '@nestjs/common';
import { WoltBotModule } from '@features/wolt-bot/wolt-bot.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [WoltBotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
