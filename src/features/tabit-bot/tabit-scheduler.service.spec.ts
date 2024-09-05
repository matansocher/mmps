import { Test, TestingModule } from '@nestjs/testing';
import { TabitSchedulerService } from './tabit-scheduler.service';

describe('TabitSchedulerService', () => {
  let service: TabitSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TabitSchedulerService],
    }).compile();

    service = module.get<TabitSchedulerService>(TabitSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
