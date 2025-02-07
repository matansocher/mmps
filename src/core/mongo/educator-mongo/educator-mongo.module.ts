import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './educator-mongo.config';
import { EducatorMongoTopicService, EducatorMongoUserPreferencesService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [EducatorMongoTopicService, EducatorMongoUserPreferencesService],
  exports: [EducatorMongoTopicService, EducatorMongoUserPreferencesService],
})
export class EducatorMongoModule {}
