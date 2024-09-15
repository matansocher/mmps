import { Test, TestingModule } from '@nestjs/testing';
import { OntopoApiService } from './ontopo-api.service';

describe('OntopoApiService', () => {
  let service: OntopoApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OntopoApiService],
    }).compile();

    service = module.get<OntopoApiService>(OntopoApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
