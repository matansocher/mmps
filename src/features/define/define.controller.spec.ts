import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DefineController, telegramBaseUrl } from './define.controller';
import type { ContactRequestDTO } from './types';

jest.mock('axios');

describe('DefineController', () => {
  let defineController: DefineController;

  const mockTelegramBotToken = 'mockBotToken';
  const mockTelegramChatId = 'mockChatId';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefineController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'DEFINE_TELEGRAM_BOT_TOKEN') return mockTelegramBotToken;
              if (key === 'DEFINE_TELEGRAM_CHAT_ID') return mockTelegramChatId;
              return null;
            }),
          },
        },
      ],
    }).compile();

    defineController = module.get<DefineController>(DefineController);
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
