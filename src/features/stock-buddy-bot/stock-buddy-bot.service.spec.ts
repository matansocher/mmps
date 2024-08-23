import { Test, TestingModule } from '@nestjs/testing';
import { StockBuddyBotService } from './stock-buddy-bot.service';

describe('StockBuddyBotService', () => {
  let service: StockBuddyBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockBuddyBotService],
    }).compile();

    service = module.get<StockBuddyBotService>(StockBuddyBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
