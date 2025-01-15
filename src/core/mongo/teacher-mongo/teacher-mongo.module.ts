import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { TeacherMongoCourseService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './teacher-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [TeacherMongoCourseService],
  exports: [TeacherMongoCourseService],
})
export class TeacherMongoModule {}
