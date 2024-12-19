import { Test, TestingModule } from '@nestjs/testing';
import { CoachBotService } from './coach-bot.service';

describe('CoachBotService', () => {
  let service: CoachBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoachBotService],
    }).compile();

    service = module.get<CoachBotService>(CoachBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
