// import { DynamicModule, Module, Provider, Scope } from '@nestjs/common';
// import { LoggerService } from './logger.service';
//
// const createLoggerService = (moduleName: string): Provider => ({
//   provide: LoggerService,
//   useFactory: (moduleName) => new LoggerService(moduleName),
// });
//
// @Module({})
// export class LoggerModule {
//   static forFeature(moduleName: string): DynamicModule {
//     return {
//       module: LoggerModule,
//       providers: [createLoggerService(moduleName)],
//       exports: [LoggerService],
//     };
//   }
// }

import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
