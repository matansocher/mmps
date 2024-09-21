import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { OntopoApiUtils } from './ontopo-api.utils';
import { OntopoApiService } from './ontopo-api.service';

@Module({
  imports: [LoggerModule.forChild(OntopoApiModule.name), UtilsModule],
  providers: [OntopoApiService, OntopoApiUtils],
  exports: [OntopoApiService],
})
export class OntopoApiModule {
  constructor(private readonly ontopoApiService: OntopoApiService) {}

  onModuleInit(): void {
    this.ontopoApiService.init(); // $$$$$$$$$$$$$$$$$ to delete after api testing ends
  }
}
// export class OntopoApiModule {}
