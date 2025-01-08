import { Test, TestingModule } from '@nestjs/testing';
import { RollinsparkSchedulerService } from './rollinspark-scheduler.service';

describe('RollinsparkSchedulerService', () => {
  let service: RollinsparkSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollinsparkSchedulerService],
    }).compile();

    service = module.get<RollinsparkSchedulerService>(RollinsparkSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
