import axios from 'axios';
import { env } from 'node:process';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DefineController, telegramBaseUrl } from './define.controller';
import type { ContactRequestDTO } from './types';

jest.mock('axios');

describe('DefineController', () => {
  let defineController: DefineController;

  const mockTelegramBotToken = 'mockBotToken';
  const mockTelegramChatId = 'mockChatId';

  beforeAll(() => {
    // Set environment variables before any tests run
    env.DEFINE_TELEGRAM_BOT_TOKEN = mockTelegramBotToken;
    env.DEFINE_TELEGRAM_CHAT_ID = mockTelegramChatId;
  });

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefineController],
    }).compile();

    defineController = module.get<DefineController>(DefineController);
  });

  afterAll(() => {
    // Clean up environment variables after all tests
    delete env.DEFINE_TELEGRAM_BOT_TOKEN;
    delete env.DEFINE_TELEGRAM_CHAT_ID;
  });

  it('should send a contact message successfully', async () => {
    const mockBody: ContactRequestDTO = { email: 'user@example.com' };

    (axios.get as jest.Mock).mockResolvedValue({ status: 200 });

    const result = await defineController.contact(mockBody);
    expect(axios.get).toHaveBeenCalledWith(
      `${telegramBaseUrl}/bot${mockTelegramBotToken}/sendMessage?chat_id=${mockTelegramChatId}&text=A new user contacted from the Define website\nEmail: user@example.com`,
    );
    expect(result).toEqual({ success: true });
  });

  it('should handle errors when sending a contact message', async () => {
    const mockBody: ContactRequestDTO = { email: 'user@example.com' };

    (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const result = await defineController.contact(mockBody);
    expect(axios.get).toHaveBeenCalledWith(
      `${telegramBaseUrl}/bot${mockTelegramBotToken}/sendMessage?chat_id=${mockTelegramChatId}&text=A new user contacted from the Define website\nEmail: user@example.com`,
    );
    expect(result).toEqual({ success: false });
  });
});
