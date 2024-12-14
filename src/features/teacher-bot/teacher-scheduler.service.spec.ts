import { Test, TestingModule } from '@nestjs/testing';
import { TeacherSchedulerService } from './teacher-scheduler.service';

describe('TeacherService', () => {
  let service: TeacherSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeacherSchedulerService],
    }).compile();

    service = module.get<TeacherSchedulerService>(TeacherSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
