import { DynamicModule, Global, Module } from '@nestjs/common';
import { Db, MongoClient, MongoClientOptions } from 'mongodb';
import { DatabaseModuleOptions } from './interface';

@Global()
@Module({})
export class MongoDatabaseFactoryModule {
  static forChild(options: DatabaseModuleOptions): DynamicModule {
    const connectionProvider = {
      provide: options.connectionName,
      useFactory: async (): Promise<Db> => {
        const client = new MongoClient(options.uri, {} as MongoClientOptions);
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
