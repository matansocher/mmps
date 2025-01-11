import { Test, TestingModule } from '@nestjs/testing';
import { TelegramGeneralService } from './telegram-general.service';

describe('TelegramGeneralService', () => {
  let service: TelegramGeneralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramGeneralService],
    }).compile();

    service = module.get<TelegramGeneralService>(TelegramGeneralService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
