import { Test, TestingModule } from '@nestjs/testing';
import { TasksManagerSchedulerService } from './tasks-manager-scheduler.service';

describe('TasksManagerSchedulerService', () => {
  let service: TasksManagerSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksManagerSchedulerService],
    }).compile();

    service = module.get<TasksManagerSchedulerService>(TasksManagerSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
