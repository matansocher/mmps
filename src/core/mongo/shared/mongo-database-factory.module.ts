import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModuleOptions } from './interface';

@Global()
@Module({})
export class MongoDatabaseFactoryModule {
  static forChild(options: DatabaseModuleOptions): DynamicModule {
    const connectionProvider = {
      provide: options.connectionName,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Db> => {
        const mongoUri = configService.getOrThrow<string>('MONGO_DB_URL');
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
