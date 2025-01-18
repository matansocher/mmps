import { Test, TestingModule } from '@nestjs/testing';
import { GoogleTranslate } from './google-translate';

describe('GoogleTranslateService', () => {
  let service: GoogleTranslate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleTranslate],
    }).compile();

    service = module.get<GoogleTranslate>(GoogleTranslate);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
