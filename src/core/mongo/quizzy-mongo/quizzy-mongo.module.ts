import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './quizzy-mongo.config';
import { QuizzyMongoGameLogService, QuizzyMongoQuestionService, QuizzyMongoSubscriptionService, QuizzyMongoUserService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [QuizzyMongoSubscriptionService, QuizzyMongoQuestionService, QuizzyMongoUserService, QuizzyMongoGameLogService],
  exports: [QuizzyMongoSubscriptionService, QuizzyMongoQuestionService, QuizzyMongoUserService, QuizzyMongoGameLogService],
})
export class QuizzyMongoModule {}
