import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { UtilsModule } from '@core/utils';
import { TeacherMongoCourseService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './teacher-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(TeacherMongoModule.name),
    UtilsModule,
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [TeacherMongoCourseService],
  exports: [TeacherMongoCourseService],
})
export class TeacherMongoModule {}
