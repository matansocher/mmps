import { Test, TestingModule } from '@nestjs/testing';
import { GoogleTranslateService } from './google-translate.service';

describe('GoogleTranslateService', () => {
  let service: GoogleTranslateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleTranslateService],
    }).compile();

    service = module.get<GoogleTranslateService>(GoogleTranslateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
