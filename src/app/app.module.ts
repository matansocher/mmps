import { Module } from '@nestjs/common';
import { CoachBotModule } from '@features/coach-bot/coach-bot.module';
import { DefineModule } from '@features/define/define.module';
import { FunFactsBotModule } from '@features/fun-facts-bot/fun-facts-bot.module';
import { TeacherBotModule } from 'src/features/teacher-bot';
// import { NewsBotModule } from '@features/news';
// import { OntopoBotModule } from '@features/ontopo-bot';
import { RollinsparkModule } from '@features/rollinspark';
// import { TabitBotModule } from '@features/tabit-bot';
import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // NewsBotModule,
    // OntopoBotModule,
    // TabitBotModule,

    VoicePalBotModule,
    WoltBotModule,
    RollinsparkModule,
    DefineModule,
    FunFactsBotModule,
    TeacherBotModule,
    CoachBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
