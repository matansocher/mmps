import { Test, TestingModule } from '@nestjs/testing';
import { FunFactsBotService } from './fun-facts-bot.service';

describe('FunFactsBotService', () => {
  let service: FunFactsBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FunFactsBotService],
    }).compile();

    service = module.get<FunFactsBotService>(FunFactsBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
