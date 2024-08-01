import { Test, TestingModule } from '@nestjs/testing';
import { MockMessagesAggregatorService, MockTelegramGeneralService } from '@mocks';
import { MessagesAggregatorService } from '@services/telegram/messages-aggregator.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
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
