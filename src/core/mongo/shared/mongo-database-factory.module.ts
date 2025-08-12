import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import { env } from 'node:process';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { DatabaseModuleOptions } from './interface';

@Global()
@Module({})
export class MongoDatabaseFactoryModule {
  static forChild(options: DatabaseModuleOptions): DynamicModule {
    const connectionProvider = {
      provide: options.connectionName,
      useFactory: async (): Promise<Db> => {
        const mongoUri = env.MONGO_DB_URL;
        const client = new MongoClient(mongoUri, {} as MongoClientOptions);
        await client.connect();
        return client.db(options.dbName);
      },
    };

    return {
      module: MongoDatabaseFactoryModule,
      providers: [connectionProvider],
      exports: [connectionProvider],
    };
  }
}
