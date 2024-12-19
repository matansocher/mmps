import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { GoogleSearchService } from './google-search.service';

@Module({
  imports: [LoggerModule.forChild(GoogleSearchModule.name), UtilsModule],
  providers: [GoogleSearchService],
  exports: [GoogleSearchService],
})
export class GoogleSearchModule {}
