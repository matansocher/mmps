import { Test, TestingModule } from '@nestjs/testing';
import { VoicePalMongoAnalyticLogService } from './voice-pal-mongo-analytic-log.service';

describe('VoicePalMongoAnalyticLogService', () => {
  let service: VoicePalMongoAnalyticLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicePalMongoAnalyticLogService],
    }).compile();

    service = module.get<VoicePalMongoAnalyticLogService>(VoicePalMongoAnalyticLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
