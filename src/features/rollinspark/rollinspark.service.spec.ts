import { Test, TestingModule } from '@nestjs/testing';
import { RollinsparkService } from './rollinspark.service';

describe('RollinsparkService', () => {
  let service: RollinsparkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollinsparkService],
    }).compile();

    service = module.get<RollinsparkService>(RollinsparkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
