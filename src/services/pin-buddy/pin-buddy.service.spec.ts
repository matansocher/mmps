import { Test, TestingModule } from '@nestjs/testing';
import { PinBuddyService } from './pin-buddy.service';

describe('PinBuddyService', () => {
  let service: PinBuddyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinBuddyService],
    }).compile();

    service = module.get<PinBuddyService>(PinBuddyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
