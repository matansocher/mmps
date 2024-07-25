import { Test, TestingModule } from '@nestjs/testing';
import { WoltBotService } from './wolt-bot.service';

describe('WoltBotService', () => {
  let service: WoltBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WoltBotService],
    }).compile();

    service = module.get<WoltBotService>(WoltBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
