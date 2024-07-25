import { Test, TestingModule } from '@nestjs/testing';
import { WoltMongoService } from './wolt-mongo.service';

describe('WoltMongoService', () => {
  let service: WoltMongoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WoltMongoService],
    }).compile();

    service = module.get<WoltMongoService>(WoltMongoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
