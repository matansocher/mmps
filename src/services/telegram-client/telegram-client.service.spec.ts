import { Test, TestingModule } from '@nestjs/testing';
import { TelegramClientService } from './telegram-client.service';

describe('TelegramClientService', () => {
  let service: TelegramClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramClientService],
    }).compile();

    service = module.get<TelegramClientService>(TelegramClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
