import { Test, TestingModule } from '@nestjs/testing';
import { GoogleSearchService } from './google-search.service';

describe('GoogleSearchService', () => {
  let service: GoogleSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleSearchService],
    }).compile();

    service = module.get<GoogleSearchService>(GoogleSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
