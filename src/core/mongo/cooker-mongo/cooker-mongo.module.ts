import { Module } from '@nestjs/common';
import { MongoDatabaseFactoryModule } from '@core/mongo/shared';
import { CONNECTION_NAME, DB_NAME } from './cooker-mongo.config';
import { CookerMongoRecipeService } from './services';

@Module({
  imports: [
    MongoDatabaseFactoryModule.forChild({
      connectionName: CONNECTION_NAME,
      dbName: DB_NAME,
    }),
  ],
  providers: [CookerMongoRecipeService],
  exports: [CookerMongoRecipeService],
})
export class CookerMongoModule {}
