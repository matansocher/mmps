import { Test, TestingModule } from '@nestjs/testing';
import {
  MockMessagesAggregatorService,
  MockTelegramGeneralService,
} from '@mocks';
import { MessagesAggregatorService } from '@services/telegram';
import { TelegramGeneralService } from '@services/telegram';
import { VoicePalBotService } from './voice-pal-bot.service';

describe('VoicePalBotService', () => {
  let service: VoicePalBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoicePalBotService,
        {
          provide: MessagesAggregatorService,
          useValue: MockMessagesAggregatorService,
        },
        {
          provide: TelegramGeneralService,
          useValue: MockTelegramGeneralService,
        },
      ],
    }).compile();

    service = module.get<VoicePalBotService>(VoicePalBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
