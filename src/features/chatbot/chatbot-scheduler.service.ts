import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { sendShortenedMessage } from '@services/telegram';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

const SUMMARY_HOUR = 23;

@Injectable()
export class ChatbotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotSchedulerService.name);

  constructor(
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
    private readonly chatbotService: ChatbotService,
  ) {}

  onModuleInit(): void {
    // this.handleDailySummary(); // for testing purposes
  }

  @Cron(`0 ${SUMMARY_HOUR} * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const prompt = `Good evening! Please create my nightly summary with the following information:

1. **Weather Forecast**: Get tomorrow's weather forecast for Kfar Saba (${tomorrow.toISOString().split('T')[0]})
2. **Calendar**: Check my calendar events for tomorrow. if you see any special events, address them.
3. **Football**: Get today's football match results from every league you know

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a warm greeting like "🌙 Good night!" and wish me sweet dreams at the end.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID.toString());

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      await this.bot.sendMessage(MY_USER_ID, '⚠️ Failed to generate your nightly summary.');
      this.logger.error(`Failed to generate/send daily summary: ${err}`);
    }
  }
}
