import { Test, TestingModule } from '@nestjs/testing';
import { TelegramBotsFactoryService } from './telegram-bots-factory.service';

describe('TelegramBotsFactoryService', () => {
  let service: TelegramBotsFactoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramBotsFactoryService],
    }).compile();

    service = module.get<TelegramBotsFactoryService>(TelegramBotsFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
