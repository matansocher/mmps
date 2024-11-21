import { Module } from '@nestjs/common';
import { DefineController } from './define.controller';

@Module({
  controllers: [DefineController],
})
export class DefineModule {}
