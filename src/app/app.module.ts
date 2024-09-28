import { Module } from '@nestjs/common';
import { DeadTerroristsModule } from '@features/dead-terrorists';
import { OntopoBotModule } from '@features/ontopo-bot';
import { TabitBotModule } from '@features/tabit-bot';
import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DeadTerroristsModule,
    OntopoBotModule,
    TabitBotModule,
    VoicePalBotModule,
    WoltBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
