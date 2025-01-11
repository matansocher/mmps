import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { TasksManagerMongoTaskService, TasksManagerMongoUserService } from './services';
import { CONNECTION_NAME, DB_NAME, MONGO_DB_URL } from './tasks-manager-mongo.config';

@Module({
  imports: [
    LoggerModule.forChild(TasksManagerMongoModule.name),
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      uri: MONGO_DB_URL,
      dbName: DB_NAME,
    }),
  ],
  providers: [TasksManagerMongoTaskService, TasksManagerMongoUserService],
  exports: [TasksManagerMongoTaskService, TasksManagerMongoUserService],
})
export class TasksManagerMongoModule {}
