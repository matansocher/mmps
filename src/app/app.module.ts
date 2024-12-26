import { Module, Type } from '@nestjs/common';
import { isProd } from '@core/config';
import { CoachBotModule } from '@features/coach-bot/coach-bot.module';
import { DefineModule } from '@features/define/define.module';
import { FunFactsBotModule } from '@features/fun-facts-bot/fun-facts-bot.module';
import { TeacherBotModule } from '@features/teacher-bot';
import { RollinsparkModule } from '@features/rollinspark';
import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { AppController } from './app.controller';
import { AppService } from './app.service';

let imports: Type[] = [TeacherBotModule];
if (isProd) {
  imports = [
    VoicePalBotModule,
    WoltBotModule,
    RollinsparkModule,
    DefineModule,
    FunFactsBotModule,
    CoachBotModule,
  ];
}

@Module({
  imports,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
