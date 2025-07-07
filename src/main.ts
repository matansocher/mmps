import * as bodyParser from 'body-parser';
import { configDotenv } from 'dotenv';
import { env } from 'node:process';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

configDotenv();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  app.enableCors();

  const config = new DocumentBuilder().setTitle('mmps').setDescription('mmps server').setVersion('1.0').addTag('mmps').build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const logger = new Logger('main.ts');
  logger.log(`NODE_VERSION: ${process.versions.node}`);

  await app.listen(env.PORT || 3000);

  logger.log(`MMPS service is running on http://localhost:${env.PORT || 3000}/api - NODE_VERSION: ${process.versions.node}`);
}

bootstrap();
