import { Test, TestingModule } from '@nestjs/testing';
import { FinanceTeacherBotService } from './finance-teacher-bot.service';

describe('FinanceTeacherBotService', () => {
  let service: FinanceTeacherBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceTeacherBotService],
    }).compile();

    service = module.get<FinanceTeacherBotService>(FinanceTeacherBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
