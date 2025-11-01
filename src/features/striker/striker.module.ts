import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/striker';
import { StrikerController } from './striker.controller';

@Module({
  providers: [StrikerController],
})
export class StrikerModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
