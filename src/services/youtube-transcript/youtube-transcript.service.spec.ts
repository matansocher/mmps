import { Test, TestingModule } from '@nestjs/testing';
import { YoutubeTranscriptService } from './youtube-transcript.service';

describe('YoutubeTranscriptService', () => {
  let service: YoutubeTranscriptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YoutubeTranscriptService],
    }).compile();

    service = module.get<YoutubeTranscriptService>(YoutubeTranscriptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
