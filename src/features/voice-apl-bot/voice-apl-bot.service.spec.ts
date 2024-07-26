import { Test, TestingModule } from '@nestjs/testing';
import { VoiceAplBotService } from './voice-apl-bot.service';

describe('WoltBotService', () => {
  let service: VoiceAplBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoiceAplBotService],
    }).compile();

    service = module.get<VoiceAplBotService>(VoiceAplBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
