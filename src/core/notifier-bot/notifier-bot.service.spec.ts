import { Test, TestingModule } from '@nestjs/testing';
import { NotifierBotService } from './notifier-bot.service';

describe('NotifierBotService', () => {
  let service: NotifierBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotifierBotService],
    }).compile();

    service = module.get<NotifierBotService>(NotifierBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
