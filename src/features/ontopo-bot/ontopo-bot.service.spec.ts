import { Test, TestingModule } from '@nestjs/testing';
import { OntopoBotService } from './ontopo-bot.service';

describe('OntopoBotService', () => {
  let service: OntopoBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OntopoBotService],
    }).compile();

    service = module.get<OntopoBotService>(OntopoBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
