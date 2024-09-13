import { Test, TestingModule } from '@nestjs/testing';
import { TabitBotService } from './tabit-bot.service';

describe('TabitBotService', () => {
  let service: TabitBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TabitBotService],
    }).compile();

    service = module.get<TabitBotService>(TabitBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
