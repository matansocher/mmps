import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { TrainerMongoExerciseService, TrainerMongoUserPreferencesService, TrainerMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME } from './trainer-mongo.config';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [TrainerMongoExerciseService, TrainerMongoUserPreferencesService, TrainerMongoUserService],
  exports: [TrainerMongoExerciseService, TrainerMongoUserPreferencesService, TrainerMongoUserService],
})
export class TrainerMongoModule {}
