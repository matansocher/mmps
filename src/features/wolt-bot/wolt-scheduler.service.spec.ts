import { Test, TestingModule } from '@nestjs/testing';
import { WoltSchedulerService } from './wolt-scheduler.service';

describe('WoltSchedulerService', () => {
  let service: WoltSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WoltSchedulerService],
    }).compile();

    service = module.get<WoltSchedulerService>(WoltSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
