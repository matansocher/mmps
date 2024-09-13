import { Test, TestingModule } from '@nestjs/testing';
import { DeadTerroristsService } from './dead-terrorists.service';

describe('DeadTerroristsService', () => {
  let service: DeadTerroristsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeadTerroristsService],
    }).compile();

    service = module.get<DeadTerroristsService>(DeadTerroristsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
