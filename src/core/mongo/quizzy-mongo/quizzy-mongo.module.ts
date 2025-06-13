import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './quizzy-mongo.config';
import { QuizzyMongoGameLogService, QuizzyMongoSubscriptionService, QuizzyMongoUserService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [QuizzyMongoSubscriptionService, QuizzyMongoUserService, QuizzyMongoGameLogService],
  exports: [QuizzyMongoSubscriptionService, QuizzyMongoUserService, QuizzyMongoGameLogService],
})
export class QuizzyMongoModule {}
