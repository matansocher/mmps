import { Test, TestingModule } from '@nestjs/testing';
import { TasksManagerBotService } from './tasks-manager-bot.service';

describe('TasksManagerService', () => {
  let service: TasksManagerBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksManagerBotService],
    }).compile();

    service = module.get<TasksManagerBotService>(TasksManagerBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
