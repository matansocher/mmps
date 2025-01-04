import { Module, Type } from '@nestjs/common';
import { isProd } from '@core/config';
import { CoachBotModule } from '@features/coach-bot';
import { DefineModule } from '@features/define';
import { TeacherBotModule } from '@features/teacher-bot';
import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { AppController } from './app.controller';
import { AppService } from './app.service';

let imports: Type[] = [CoachBotModule];
if (isProd) {
  imports = [
    VoicePalBotModule,
    WoltBotModule,
    DefineModule,
    CoachBotModule,
    TeacherBotModule,
  ];
}

@Module({
  imports,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
