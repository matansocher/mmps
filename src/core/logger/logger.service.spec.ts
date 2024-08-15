import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let logger: LoggerService;

  const method = 'method';
  const text = 'text';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    logger = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  describe('info', () => {
    it('should call console.log', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      logger.info(method, text);

      expect(spy).toHaveBeenCalledWith(`${logger.filename} | ${method} | ${text}`);
    });
  });

  describe('error', () => {
    it('should call console.error', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();

      logger.error(method, text);

      expect(spy).toHaveBeenCalledWith(`${logger.filename} | ${method} | ${text}`);
    });
  });
});
