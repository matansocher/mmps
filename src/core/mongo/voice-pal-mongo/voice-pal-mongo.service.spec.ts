import { Test, TestingModule } from '@nestjs/testing';
import { VoicePalMongoService } from './voice-pal-mongo.service';

describe('VoicePalMongoService', () => {
  let service: VoicePalMongoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicePalMongoService],
    }).compile();

    service = module.get<VoicePalMongoService>(VoicePalMongoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
