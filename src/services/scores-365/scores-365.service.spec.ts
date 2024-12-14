import { Test, TestingModule } from '@nestjs/testing';
import { Scores365Service } from './scores-365.service';

describe('Scores365Service', () => {
  let service: Scores365Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Scores365Service],
    }).compile();

    service = module.get<Scores365Service>(Scores365Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
