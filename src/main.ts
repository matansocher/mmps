import { configDotenv } from 'dotenv';
configDotenv();
import { env } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  await app.listen(env.PORT || 3000);
}
bootstrap();
