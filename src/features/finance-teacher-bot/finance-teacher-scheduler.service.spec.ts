import { Test, TestingModule } from '@nestjs/testing';
import { FinanceTeacherSchedulerService } from './finance-teacher-scheduler.service';

describe('FinanceTeacherService', () => {
  let service: FinanceTeacherSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceTeacherSchedulerService],
    }).compile();

    service = module.get<FinanceTeacherSchedulerService>(FinanceTeacherSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
