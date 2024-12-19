import { Test, TestingModule } from '@nestjs/testing';
import { ScrapingService } from './scraping.service';

describe('ScrapingService', () => {
  let service: ScrapingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScrapingService],
    }).compile();

    service = module.get<ScrapingService>(ScrapingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
