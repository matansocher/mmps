import { Test, TestingModule } from '@nestjs/testing';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

describe('SocialMediaDownloaderService', () => {
  let service: SocialMediaDownloaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialMediaDownloaderService],
    }).compile();

    service = module.get<SocialMediaDownloaderService>(SocialMediaDownloaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
