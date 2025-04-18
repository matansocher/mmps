import axios from 'axios';
import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactRequestDTO, ContactResponseDTO } from './types';

export const telegramBaseUrl = 'https://api.telegram.org';

@Controller('define')
export class DefineController {
  private readonly logger = new Logger(DefineController.name);
  private readonly telegramBotToken: string;
  private readonly telegramChatId: string;

  constructor(private readonly configService: ConfigService) {
    this.telegramBotToken = this.configService.get('DEFINE_TELEGRAM_BOT_TOKEN');
    this.telegramChatId = this.configService.get('DEFINE_TELEGRAM_CHAT_ID');
  }

  @Post('contact')
  async contact(@Body() body: ContactRequestDTO): Promise<ContactResponseDTO> {
    const { email } = body;
    try {
      this.logger.log(`A new user contacted from the Define website: ${email}`);
      const messageText = `A new user contacted from the Define website\nEmail: ${email}`;
      const telegramApiUrl = `${telegramBaseUrl}/bot${this.telegramBotToken}/sendMessage?chat_id=${this.telegramChatId}&text=${messageText}`;
      const result = await axios.get(telegramApiUrl);
      return { success: result.status === 200 };
    } catch (err) {
      this.logger.error(`Failed to send contact form for ${email}, error: ${err}`);
      return { success: false };
    }
  }
}
