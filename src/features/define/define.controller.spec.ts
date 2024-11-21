import { Test, TestingModule } from '@nestjs/testing';
import { DefineController } from './define.controller';

describe('DefineController', () => {
  let controller: DefineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefineController],
    }).compile();

    controller = module.get<DefineController>(DefineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
