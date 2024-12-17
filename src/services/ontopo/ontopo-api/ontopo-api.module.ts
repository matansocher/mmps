import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { OntopoApiService } from './ontopo-api.service';
import { OntopoApiUtils } from './ontopo-api.utils';

@Module({
  imports: [LoggerModule.forChild(OntopoApiModule.name), UtilsModule],
  providers: [OntopoApiService, OntopoApiUtils],
  exports: [OntopoApiService],
})
export class OntopoApiModule {}
