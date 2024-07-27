import { Test, TestingModule } from '@nestjs/testing';
import { VoicePalService } from './voice-pal.service';

describe('VoicePalService', () => {
  let service: VoicePalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicePalService],
    }).compile();

    service = module.get<VoicePalService>(VoicePalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
