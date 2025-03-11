import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { TeacherMongoCourseParticipationService, TeacherMongoCourseService, TeacherMongoUserPreferencesService, TeacherMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './teacher-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [TeacherMongoCourseService, TeacherMongoCourseParticipationService, TeacherMongoUserPreferencesService, TeacherMongoUserService],
  exports: [TeacherMongoCourseService, TeacherMongoCourseParticipationService, TeacherMongoUserPreferencesService, TeacherMongoUserService],
})
export class TeacherMongoModule {}
