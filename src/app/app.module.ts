import { Module } from '@nestjs/common';
import { DefineModule } from '@features/define/define.module';
// import { NewsBotModule } from '@features/news';
// import { OntopoBotModule } from '@features/ontopo-bot';
import { RollinsparkModule } from '@features/rollinspark/rollinspark.module';
// import { TabitBotModule } from '@features/tabit-bot';
// import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // NewsBotModule,
    // OntopoBotModule,
    // TabitBotModule,
    // VoicePalBotModule,
    WoltBotModule,
    RollinsparkModule,
    DefineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
