import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { TeacherMongoModule } from '@core/mongo/teacher-mongo';
import { UtilsModule } from '@core/utils';
import { OpenaiModule } from '@services/openai';
import { TeacherService } from './teacher.service';

@Module({
  imports: [LoggerModule.forChild(TeacherModule.name), UtilsModule, TeacherMongoModule, OpenaiModule],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
