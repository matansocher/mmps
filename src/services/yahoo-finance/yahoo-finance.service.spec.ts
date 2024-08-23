import { Test, TestingModule } from '@nestjs/testing';
import { YahooFinanceService } from './yahoo-finance.service';

describe('YahooFinanceService', () => {
  let service: YahooFinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YahooFinanceService],
    }).compile();

    service = module.get<YahooFinanceService>(YahooFinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
