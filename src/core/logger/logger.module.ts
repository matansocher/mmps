import { DynamicModule, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {
  static forChild(moduleName: string = 'LoggerModule'): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useValue: new LoggerService(moduleName),
        },
      ],
      exports: [LoggerService],
    };
  }
}
