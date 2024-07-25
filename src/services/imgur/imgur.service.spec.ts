import { Test, TestingModule } from '@nestjs/testing';
import { ImgurService } from './imgur.service';

describe('ImgurService', () => {
  let service: ImgurService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImgurService],
    }).compile();

    service = module.get<ImgurService>(ImgurService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
