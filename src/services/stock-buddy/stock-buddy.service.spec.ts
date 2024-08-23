import { Test, TestingModule } from '@nestjs/testing';
import { StockBuddyService } from './stock-buddy.service';

describe('StockBuddyService', () => {
  let service: StockBuddyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockBuddyService],
    }).compile();

    service = module.get<StockBuddyService>(StockBuddyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
