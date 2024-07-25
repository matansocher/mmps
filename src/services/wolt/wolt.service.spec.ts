import { Test, TestingModule } from '@nestjs/testing';
import { WoltService } from './wolt.service';

describe('WoltService', () => {
  let service: WoltService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WoltService],
    }).compile();

    service = module.get<WoltService>(WoltService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
