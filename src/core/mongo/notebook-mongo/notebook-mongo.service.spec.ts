import { Test, TestingModule } from '@nestjs/testing';
import { NotebookMongoService } from './notebook-mongo.service';

describe('NotebookMongoService', () => {
  let service: NotebookMongoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotebookMongoService],
    }).compile();

    service = module.get<NotebookMongoService>(NotebookMongoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
