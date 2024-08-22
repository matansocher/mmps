import { DatabaseModuleOptions } from '@core/mongo/shared/interface/database-module-options.interface';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongoClient, Db, MongoClientOptions } from 'mongodb';

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
