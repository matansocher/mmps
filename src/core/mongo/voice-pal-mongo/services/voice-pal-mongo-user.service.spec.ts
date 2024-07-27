import { Test, TestingModule } from '@nestjs/testing';
import { VoicePalMongoUserService } from './voice-pal-mongo-user.service';

describe('VoicePalMongoUserService', () => {
  let service: VoicePalMongoUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicePalMongoUserService],
    }).compile();

    service = module.get<VoicePalMongoUserService>(VoicePalMongoUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
