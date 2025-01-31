import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { TeacherMongoCourseService, TeacherMongoUserPreferencesService } from './services';
import { CONNECTION_NAME, DB_NAME } from './teacher-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [TeacherMongoCourseService, TeacherMongoUserPreferencesService],
  exports: [TeacherMongoCourseService, TeacherMongoUserPreferencesService],
})
export class TeacherMongoModule {}
