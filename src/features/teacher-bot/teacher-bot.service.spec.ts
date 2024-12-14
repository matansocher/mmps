import { Test, TestingModule } from '@nestjs/testing';
import { TeacherBotService } from './teacher-bot.service';

describe('TeacherBotService', () => {
  let service: TeacherBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeacherBotService],
    }).compile();

    service = module.get<TeacherBotService>(TeacherBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
