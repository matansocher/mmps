import { DynamicModule, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {
  static forRoot(moduleName: string = 'LoggerModule'): DynamicModule {
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
