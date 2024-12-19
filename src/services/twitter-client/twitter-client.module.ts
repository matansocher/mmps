import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { ScrapingModule } from '@services/scraping/scraping.module';
import { TwitterClientFactoryModule } from './twitter-client-factory/twitter-client-factory.module';
import { TwitterClientService } from './twitter-client.service';

@Module({
  imports: [LoggerModule.forChild(TwitterClientModule.name), UtilsModule, TwitterClientFactoryModule.forChild(), ScrapingModule],
  providers: [TwitterClientService],
  exports: [TwitterClientService],
})
export class TwitterClientModule {}
