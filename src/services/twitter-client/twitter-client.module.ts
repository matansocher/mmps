import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { TwitterClientFactoryModule } from '@services/twitter-client/twitter-client-factory/twitter-client-factory.module';
import { TwitterClientService } from './twitter-client.service';

@Module({
  imports: [LoggerModule.forChild(TwitterClientModule.name), UtilsModule, TwitterClientFactoryModule.forChild()],
  providers: [TwitterClientService],
  exports: [TwitterClientService],
})
export class TwitterClientModule {}
