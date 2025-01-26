import axios from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DefineController, telegramBaseUrl } from './define.controller';
import { ContactRequestDTO } from './types';

jest.mock('axios');

describe('DefineController', () => {
  let defineController: DefineController;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DefineController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    defineController = module.get<DefineController>(DefineController);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should send a contact message successfully', async () => {
    // Arrange
    const mockBody: ContactRequestDTO = { email: 'user@example.com' };
    const mockTelegramBotToken = 'mockBotToken';
    const mockTelegramChatId = 'mockChatId';
    const mockTelegramResponse = { status: 200 };

    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'DEFINE_TELEGRAM_BOT_TOKEN') return mockTelegramBotToken;
      if (key === 'DEFINE_TELEGRAM_CHAT_ID') return mockTelegramChatId;
      return null;
    });

    (axios.get as jest.Mock).mockResolvedValue(mockTelegramResponse);

    // Act
    const result = await defineController.contact(mockBody);

    // Assert
    expect(configService.get).toHaveBeenCalledWith('DEFINE_TELEGRAM_BOT_TOKEN');
    expect(configService.get).toHaveBeenCalledWith('DEFINE_TELEGRAM_CHAT_ID');
    expect(axios.get).toHaveBeenCalledWith(
      `${telegramBaseUrl}/bot${mockTelegramBotToken}/sendMessage?chat_id=${mockTelegramChatId}&text=A new user contacted from the Define website\nEmail: user@example.com`,
    );
    expect(result).toEqual({ success: true });
  });

  it('should handle errors when sending a contact message', async () => {
    // Arrange
    const mockBody: ContactRequestDTO = { email: 'user@example.com' };
    const mockTelegramBotToken = 'mockBotToken';
    const mockTelegramChatId = 'mockChatId';

    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'DEFINE_TELEGRAM_BOT_TOKEN') return mockTelegramBotToken;
      if (key === 'DEFINE_TELEGRAM_CHAT_ID') return mockTelegramChatId;
      return null;
    });

    (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

    // Act
    const result = await defineController.contact(mockBody);

    // Assert
    expect(configService.get).toHaveBeenCalledWith('DEFINE_TELEGRAM_BOT_TOKEN');
    expect(configService.get).toHaveBeenCalledWith('DEFINE_TELEGRAM_CHAT_ID');
    expect(axios.get).toHaveBeenCalledWith(
      `${telegramBaseUrl}/bot${mockTelegramBotToken}/sendMessage?chat_id=${mockTelegramChatId}&text=A new user contacted from the Define website\nEmail: user@example.com`,
    );
    expect(result).toEqual({ success: false });
  });
});
