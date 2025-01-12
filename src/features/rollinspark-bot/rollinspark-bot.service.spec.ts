import { Test, TestingModule } from '@nestjs/testing';
import { RollinsparkBotService } from './rollinspark-bot.service';

describe('RollinsparkBotService', () => {
  let service: RollinsparkBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollinsparkBotService],
    }).compile();

    service = module.get<RollinsparkBotService>(RollinsparkBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
