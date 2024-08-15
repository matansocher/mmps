import { Test, TestingModule } from '@nestjs/testing';
import { MockMessagesAggregatorService, MockTelegramGeneralService } from '@mocks';
import { MessagesAggregatorService } from '@services/telegram';
import { TelegramGeneralService } from '@services/telegram';
import { PinBuddyBotService } from './pin-buddy-bot.service';

describe('PinBuddyBotService', () => {
  let service: PinBuddyBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinBuddyBotService,
        { provide: MessagesAggregatorService, useValue: MockMessagesAggregatorService },
        { provide: TelegramGeneralService, useValue: MockTelegramGeneralService },
      ],
    }).compile();

    service = module.get<PinBuddyBotService>(PinBuddyBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
