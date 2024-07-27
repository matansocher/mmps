import { Test, TestingModule } from '@nestjs/testing';
import { VoicePalBotService } from './voice-pal-bot.service';

describe('VoicePalBotService', () => {
  let service: VoicePalBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicePalBotService],
    }).compile();

    service = module.get<VoicePalBotService>(VoicePalBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
