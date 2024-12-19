import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { ScrapingService } from './scraping.service';

@Module({
  imports: [LoggerModule.forChild(ScrapingModule.name), UtilsModule],
  providers: [ScrapingService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
